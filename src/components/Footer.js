export default function Footer() {
  return (
    <footer className="glass-footer">
      <div className="container footer-content" style={{ justifyContent: 'center' }}>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} PrepTalk. Hak Cipta Dilindungi.</p>
      </div>
    </footer>
  )
}
