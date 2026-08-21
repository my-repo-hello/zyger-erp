import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import Navigation, { type NavigationNavigatePayload } from './Navigation';
import { getScreenComponent } from '../../config/screenRegistry';
import { NAV_ITEMS } from '../../config/navigation';
import DashboardPage from '../../pages/dashboard/DashboardPage';

interface SearchResult {
  id: string;
  label: string;
  icon: string;
  screenId: string;
}

function flattenNav(nodes: unknown[], icon?: string): SearchResult[] {
  const out: SearchResult[] = [];
  for (const n of nodes as Record<string, unknown>[]) {
    if (n.type === 'item' && n.screenId) {
      out.push({ id: String(n.id), label: String(n.label), icon: String(n.icon ?? icon ?? 'article'), screenId: String(n.screenId) });
    }
    if (n.type === 'group' && Array.isArray(n.children)) {
      out.push(...flattenNav(n.children, String(n.icon ?? icon)));
    }
  }
  return out;
}

const ALL_SCREENS = flattenNav(NAV_ITEMS);

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('zyger-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  }
  return 'light';
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useTabs();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zyger-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Keyboard shortcut: Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setSearchQuery('');
    }
  }, [searchOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search results — match each word separately
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return ALL_SCREENS.filter((s) => {
      const label = s.label.toLowerCase();
      const id = s.id.toLowerCase();
      return words.every((w) => label.includes(w) || id.includes(w));
    });
  }, [searchQuery]);

  useEffect(() => {
    if (tabs.length === 0) {
      openTab({ id: 'dashboard', label: 'Dashboard', icon: 'space_dashboard', pin: true, component: DashboardPage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openScreen = (payload: NavigationNavigatePayload) => {
    openTab({
      id: payload.id,
      label: payload.label,
      icon: payload.icon,
      component: getScreenComponent(payload.id),
      props: { title: payload.label, screenId: payload.id },
    });
    setSearchOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
  };

  const openSearchResult = (result: SearchResult) => {
    openScreen({ id: result.screenId, label: result.label, icon: result.icon });
  };

  return (
    <>
      {/* ---- Global Search Popup ---- */}
      {searchOpen && (
        <div className="search-pop" onClick={() => setSearchOpen(false)}>
          <div className="search-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--muted)', fontSize: 22 }}>search</span>
              <input
                ref={searchRef}
                className="in"
                placeholder="Type to search screens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    openSearchResult(searchResults[0]);
                  }
                }}
                style={{ flex: 1, fontSize: 15 }}
              />
              <button className="btn btn-sm" onClick={() => setSearchOpen(false)}>ESC</button>
            </div>
            <div style={{ maxHeight: 360, overflow: 'auto' }}>
              {!searchQuery.trim() ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 28, display: 'block', margin: '0 auto 6px', opacity: 0.4 }}>search</span>
                  Type to search screens...
                </div>
              ) : searchResults.length > 0 ? searchResults.map((r, i) => (
                <button
                  key={r.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
                    border: 'none', background: i === 0 ? 'var(--blue-bg)' : 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    fontSize: 14, color: 'var(--text)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i === 0 ? 'var(--blue-bg)' : 'none')}
                  onClick={() => openSearchResult(r)}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--muted)' }}>{r.icon}</span>
                  {r.label}
                  {i === 0 && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>Enter ↵</span>}
                </button>
              )              ) : (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 32, display: 'block', margin: '0 auto 8px', opacity: 0.3 }}>search_off</span>
                  No results for "<b>{searchQuery}</b>"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Header ---- */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">Z</div>
          <div className="brand-titles">
            <b>Zyger ERP</b>
            <small>Precision Manufacturing ERP</small>
          </div>
        </div>

        <div className="top-actions">
          {/* Search */}
          <button className="icon-btn" title="Search (Ctrl+K)" onClick={() => setSearchOpen(true)}>
            <span className="material-symbols-rounded">search</span>
          </button>

          {/* Dark Mode Toggle */}
          <button className="icon-btn" title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} onClick={toggleTheme}>
            <span className="material-symbols-rounded">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          </button>

          {/* Notifications */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button className="icon-btn" title="Notifications" onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false); }}>
              <span className="material-symbols-rounded">notifications</span>
              <span className="n-badge">3</span>
            </button>
            {notifOpen && (
              <div className="pop show">
                <div className="p-head">
                  <b style={{ fontSize: 13 }}>Notifications</b>
                  <small>3 unread</small>
                </div>
                <hr />
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--blue)' }}>info</span>
                  <div>
                    <b style={{ fontSize: 12 }}>System Ready</b>
                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11 }}>ERP modules loaded successfully</small>
                  </div>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--green)' }}>check_circle</span>
                  <div>
                    <b style={{ fontSize: 12 }}>Database Connected</b>
                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11 }}>PostgreSQL connection active</small>
                  </div>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--yellow)' }}>warning</span>
                  <div>
                    <b style={{ fontSize: 12 }}>Pending Updates</b>
                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11 }}>3 planning modules need review</small>
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className="pop-wrap">
            <button className="profile-btn" onClick={() => { setProfileOpen((o) => !o); setNotifOpen(false); }}>
              <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
              <span className="p-name">{user?.username || 'User'}</span>
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>expand_more</span>
            </button>
            {profileOpen && (
              <div className="pop show">
                <div className="p-head">
                  <div className="avatar big">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
                  <div>
                    <b style={{ fontSize: 13 }}>{user?.username || 'User'}</b>
                    <small>{user?.role || 'User'}</small>
                  </div>
                </div>
                <hr />
                <a href="#" onClick={(e) => { e.preventDefault(); }}>
                  <span className="material-symbols-rounded">person</span>
                  My Profile
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); }}>
                  <span className="material-symbols-rounded">settings</span>
                  Settings
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); }}>
                  <span className="material-symbols-rounded">help</span>
                  Help & Support
                </a>
                <hr />
                <a href="#" className="out" onClick={(e) => { e.preventDefault(); logout(); }}>
                  <span className="material-symbols-rounded">logout</span>
                  Sign Out
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <Navigation onNavigate={openScreen} />

      <div className="tabbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${tab.id === activeTabId ? 'on' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {!tab.pin && (
              <span className="x" onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }}>✕</span>
            )}
          </button>
        ))}
      </div>

      <main className="view-container">
        {tabs.map((tab) => {
          const Comp = tab.component;
          return (
            <div key={tab.id} style={{ display: tab.id === activeTabId ? 'block' : 'none' }}>
              <Comp {...(tab.props ?? {})} />
            </div>
          );
        })}
      </main>
    </>
  );
}
