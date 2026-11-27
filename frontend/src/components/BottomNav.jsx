import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, DoorClosed, Users, Receipt, LayoutGrid } from 'lucide-react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const scrollStopTimerRef = useRef(null);

  const currentPath = location.pathname;

  const navItems = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Rooms', path: '/rooms', icon: DoorClosed },
    { label: 'Tenants', path: '/tenants', icon: Users },
    { label: 'Bills', path: '/bills', icon: Receipt },
    { label: 'More', path: '/more', icon: LayoutGrid },
  ];

  // Keep navbar visible on navigation
  useEffect(() => {
    setVisible(true);
    lastScrollYRef.current = window.pageYOffset || document.documentElement.scrollTop || 0;
  }, [currentPath]);

  // YouTube-style scroll behavior:
  // - Fixed at the bottom of the viewport (visible screen)
  // - Hides smoothly when scrolling down actively to give full reading space
  // - Appears immediately when scrolling up
  // - Wherever user stops scrolling, automatically reveals after a brief pause
  // - Always visible at top and bottom of page
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
          const diff = currentScrollY - lastScrollYRef.current;

          // Always visible at the very top of the page
          if (currentScrollY < 30) {
            setVisible(true);
            lastScrollYRef.current = currentScrollY;
            ticking = false;
            return;
          }

          // Always visible if reaching near the end of the document
          const windowHeight = window.innerHeight;
          const docHeight = document.documentElement.scrollHeight;
          if (currentScrollY + windowHeight >= docHeight - 40) {
            setVisible(true);
            lastScrollYRef.current = currentScrollY;
            ticking = false;
            return;
          }

          // Scroll DOWN: tuck away navbar for full viewing area
          if (diff > 8) {
            setVisible(false);
          }
          // Scroll UP: immediately reveal navbar
          else if (diff < -6) {
            setVisible(true);
          }

          // YouTube behavior: whenever user stops scrolling, reveal navbar at the bottom of the screen!
          if (scrollStopTimerRef.current) {
            clearTimeout(scrollStopTimerRef.current);
          }
          scrollStopTimerRef.current = setTimeout(() => {
            setVisible(true);
          }, 200);

          lastScrollYRef.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollStopTimerRef.current) {
        clearTimeout(scrollStopTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Layout Spacer so the page's last cards/buttons are never hidden behind the fixed bar */}
      <div className="bottom-nav-spacer" style={{ height: '64px', width: '100%', flexShrink: 0, pointerEvents: 'none' }} />

      {/* YouTube-Style Fixed Floating Bottom Navigation */}
      <nav
        className={`bottom-nav ${visible ? 'nav-visible' : 'nav-hidden'}`}
        aria-label="Main Navigation"
      >
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive =
            item.label === 'Home'
              ? currentPath === '/home' || currentPath === '/dashboard' || currentPath === '/'
              : item.label === 'Rooms'
              ? currentPath.startsWith('/rooms')
              : item.label === 'Tenants'
              ? currentPath.startsWith('/tenants')
              : item.label === 'Bills'
              ? currentPath.startsWith('/bills')
              : item.label === 'More'
              ? currentPath.startsWith('/more')
              : currentPath === item.path;

          return (
            <button
              key={item.label}
              type="button"
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                navigate(item.path);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label={item.label}
            >
              <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
