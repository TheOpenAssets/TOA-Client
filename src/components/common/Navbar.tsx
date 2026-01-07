import { Link, useNavigate } from "react-router-dom";
import { useAccount, useDisconnect } from 'wagmi';
import { Button } from "../ui/button";
import { NotificationBell } from "../notifications/NotificationBell";
import { useAuthActions } from "../../hooks/useAuthActions";

const Navbar = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { handleGetStarted, isAuthenticating } = useAuthActions();

  const handleLogout = () => {
    disconnect();
    // Maybe clear auth store as well
    navigate('/');
  };

  const truncateAddress = (addr: string | undefined) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <div className="flex items-center justify-between h-16">
      {/* Left: Logo */}
      <Link to="/" className="navbar-logo">
        <img src="/logo-light.svg" alt="Mantle" className="h-8" />
      </Link>

      {/* Center: Navigation */}
      <nav className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1 rounded-full border border-gray-200/80">
        <Button variant="ghost" className="rounded-full" onClick={() => navigate('/marketplace')}>Marketplace</Button>
        <Button variant="ghost" className="rounded-full" onClick={() => navigate('/portfolio')}>Portfolio</Button>
        <Button variant="ghost" className="rounded-full" onClick={() => navigate('/borrow')}>Borrow</Button>
      </nav>

      {/* Right: Wallet Display */}
      <div className="flex items-center gap-3">
        {address ? (
          <>
            <NotificationBell role="INVESTOR" />
            <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-mono text-sm font-medium text-gray-800 shadow-sm">
              {truncateAddress(address)}
            </div>
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <Button onClick={handleGetStarted} disabled={isAuthenticating}>
            {isAuthenticating ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Navbar;