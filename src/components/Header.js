'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { showToast } from '../lib/toast';

export default function Header() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Profile edit fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Image Editor / Cropper States
  const [editorImage, setEditorImage] = useState(null);
  const [imageRatio, setImageRatio] = useState(1);
  const [showCropModal, setShowCropModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const imageRef = useRef(null);

  useEffect(() => {
    // Call backend endpoint to make sure public 'avatars' bucket exists in Supabase Storage
    fetch('/api/setup-storage').catch(err => console.error("Error ensuring storage bucket:", err));

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      if (data) {
        setProfile(data);
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Read file for editor preview
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        setImageRatio(img.width / img.height);
        setEditorImage(reader.result);
        setZoom(1);
        setRotation(0);
        setOffsetX(0);
        setOffsetY(0);
        setShowCropModal(true);
      };
    };
    reader.readAsDataURL(file);
  };

  const clampOffsets = (x, y, currentZoom) => {
    if (!imageRef.current) return { x, y };
    
    const img = imageRef.current;
    const r = img.naturalWidth / img.naturalHeight;
    const size = 200; // crop-window size
    
    let w_i = size;
    let h_i = size;
    
    if (r > 1) {
      w_i = size * r;
      h_i = size;
    } else {
      w_i = size;
      h_i = size / r;
    }
    
    const widthScaled = w_i * currentZoom;
    const heightScaled = h_i * currentZoom;
    
    const maxOffsetX = (widthScaled - size) / 2;
    const minOffsetX = -maxOffsetX;
    
    const maxOffsetY = (heightScaled - size) / 2;
    const minOffsetY = -maxOffsetY;
    
    return {
      x: Math.max(minOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(minOffsetY, Math.min(maxOffsetY, y))
    };
  };

  // Dragging handlers for positioning the avatar
  const handleMouseDown = (e) => {
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e) => {
    if (!dragStart) return;
    const targetX = e.clientX - dragStart.x;
    const targetY = e.clientY - dragStart.y;
    const { x, y } = clampOffsets(targetX, targetY, zoom);
    setOffsetX(x);
    setOffsetY(y);
  };

  const handleMouseUp = () => {
    setDragStart(null);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setDragStart({ x: e.touches[0].clientX - offsetX, y: e.touches[0].clientY - offsetY });
    }
  };

  const handleTouchMove = (e) => {
    if (!dragStart || e.touches.length !== 1) return;
    const targetX = e.touches[0].clientX - dragStart.x;
    const targetY = e.touches[0].clientY - dragStart.y;
    const { x, y } = clampOffsets(targetX, targetY, zoom);
    setOffsetX(x);
    setOffsetY(y);
  };

  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
    const { x, y } = clampOffsets(offsetX, offsetY, newZoom);
    setOffsetX(x);
    setOffsetY(y);
  };

  const handleCropAndUpload = () => {
    if (!imageRef.current) return;
    
    setUploadingFile(true);
    setShowCropModal(false);

    // Create offscreen canvas for rendering the crop
    const canvas = document.createElement('canvas');
    const size = 300; // Output avatar size (300x300)
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const img = imageRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Move to center of canvas to apply rotations & offsets
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Draw the image onto the canvas with scale, zoom & custom offsets
    // Calculate aspect ratio scaling to fit inside the 300px box
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let drawWidth = size;
    let drawHeight = size;

    if (imgRatio > 1) {
      drawHeight = size;
      drawWidth = size * imgRatio;
    } else {
      drawWidth = size;
      drawHeight = size / imgRatio;
    }

    ctx.drawImage(
      img, 
      -drawWidth / 2 * zoom + offsetX, 
      -drawHeight / 2 * zoom + offsetY, 
      drawWidth * zoom, 
      drawHeight * zoom
    );

    // Convert canvas to Blob & upload to Supabase
    canvas.toBlob(async (blob) => {
      if (!blob) {
        showToast('Gagal memproses gambar.', 'error');
        setUploadingFile(false);
        return;
      }
      await uploadAvatarBlob(blob);
    }, 'image/jpeg', 0.9);
  };

  const uploadAvatarBlob = async (blob) => {
    try {
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      showToast('Foto profil berhasil diunggah!', 'success');
    } catch (err) {
      console.error('Error uploading file:', err);
      showToast('Gagal mengunggah foto: ' + err.message, 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      setProfile({
        id: user.id,
        username,
        full_name: fullName,
        avatar_url: avatarUrl
      });
      setShowModal(false);
      showToast('Profil berhasil diperbarui!', 'success');
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast('Gagal memperbarui profil: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowModal(false);
    window.location.reload();
  };

  const handleGuestClick = () => {
    window.location.href = '/?auth=login';
  };

  return (
    <>
      <header className="glass-header">
        <nav className="container navbar">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
            <div className="logo-icon">🧠</div>
            <span>Prep<strong>Talk</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: 'auto' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <a href="/dashboard" style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>
                  Riwayat Evaluasi
                </a>
                <div className="user-profile-pill" onClick={() => setShowModal(true)} style={{ cursor: 'pointer' }}>
                  <div className="avatar">
                    <img 
                      src={profile?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} 
                      alt="User Avatar" 
                    />
                  </div>
                  <span className="user-greeting">
                    Halo, <strong>{profile?.username || user.email.split('@')[0]}!</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="user-profile-pill" onClick={handleGuestClick} style={{ cursor: 'pointer' }}>
                <div className="avatar" style={{ background: '#e2e8f0', color: '#64748b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  👤
                </div>
                <span className="user-greeting" style={{ paddingRight: '0.25rem' }}>
                  <strong>Mode Tamu</strong>
                </span>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Profile Settings Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-section">
              <h2 className="modal-title">Pengaturan Akun</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="modal-form">
              <div className="form-group text-center">
                <div className="avatar-preview-container">
                  <img 
                    className="avatar-large"
                    src={avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} 
                    alt="Preview Avatar" 
                  />
                </div>
                
                {/* File Upload Selector */}
                <div className="mt-2">
                  <label className="btn btn-secondary" style={{ width: 'auto', display: 'inline-flex', cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                    {uploadingFile ? 'Mengunggah...' : 'Pilih Foto Baru'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileSelect} 
                      disabled={uploadingFile}
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={user?.email || ''} 
                  disabled 
                  style={{ background: '#f1f5f9', color: '#64748b' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleLogout}
                  style={{ background: '#fee2e2', color: '#ef4444' }}
                >
                  Keluar (Logout)
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSaving || uploadingFile}
                  style={{ width: 'auto' }}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Editor / Cropper Modal */}
      {showCropModal && (
        <div className="modal-overlay" style={{ zIndex: 10100 }}>
          <div className="modal-content-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header-section">
              <h2 className="modal-title">Sesuaikan Foto</h2>
            </div>
            
            <div className="text-center" style={{ margin: '1rem 0' }}>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                Geser gambar di dalam lingkaran untuk memposisikan.
              </p>
              
              {/* Circular Crop Frame Window */}
              <div 
                className="crop-window"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                <img
                  ref={imageRef}
                  src={editorImage}
                  alt="Edit"
                  style={{
                    transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom}) rotate(${rotation}deg)`,
                    cursor: 'move',
                    width: imageRatio > 1 ? 'auto' : '100%',
                    height: imageRatio > 1 ? '100%' : 'auto',
                    transformOrigin: 'center center'
                  }}
                  draggable="false"
                />
              </div>
            </div>

            {/* Sliders for Zoom and Rotation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.5rem 0' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Perbesar (Zoom)</label>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Putar (Rotation)</label>
                  <span>{rotation}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowCropModal(false)}
              >
                Batal
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleCropAndUpload}
              >
                Potong & Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
