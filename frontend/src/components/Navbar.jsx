import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Crown, 
  LogOut, 
  User, 
  CheckCircle2,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/60 backdrop-blur-2xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/feed" 
            className="font-heading text-xl font-bold text-foreground hover:text-primary transition-colors"
            data-testid="nav-logo"
          >
            Bells & Whistles
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/feed" icon={Home} label="Feed" isActive={isActive('/feed')} />
            
            {isAdmin() && (
              <NavLink 
                to="/admin" 
                icon={Crown} 
                label="Admin" 
                isActive={isActive('/admin')} 
                highlight 
              />
            )}

            {/* Profile */}
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  {profile?.displayName || user.email}
                  {profile?.isVerified && (
                    <CheckCircle2 className="w-4 h-4 text-accent-cyan" />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin() ? 'Admin' : 'Member'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center flex-shrink-0">
                {profile?.photoURL ? (
                  <img 
                    src={profile.photoURL} 
                    alt={profile.displayName} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all duration-300 flex-shrink-0"
                data-testid="nav-logout-btn"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 text-foreground"
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/5">
          <div className="px-4 py-6 space-y-4">
            <MobileNavLink 
              to="/feed" 
              icon={Home} 
              label="Feed" 
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {isAdmin() && (
              <MobileNavLink 
                to="/admin" 
                icon={Crown} 
                label="Admin Dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                highlight
              />
            )}

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground flex items-center gap-1">
                    {profile?.displayName || user.email}
                    {profile?.isVerified && (
                      <CheckCircle2 className="w-4 h-4 text-accent-cyan" />
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                data-testid="mobile-logout-btn"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLink = ({ to, icon: Icon, label, isActive, highlight }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
      isActive 
        ? highlight
          ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/30'
          : 'bg-primary/20 text-primary border border-primary/30'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
    }`}
    data-testid={`nav-${label.toLowerCase()}`}
  >
    <Icon className="w-4 h-4" />
    <span className="text-sm font-medium">{label}</span>
  </Link>
);

const MobileNavLink = ({ to, icon: Icon, label, onClick, highlight }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
      highlight
        ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
        : 'text-foreground hover:bg-white/5'
    }`}
    data-testid={`mobile-nav-${label.toLowerCase().replace(' ', '-')}`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </Link>
);

export default Navbar;
