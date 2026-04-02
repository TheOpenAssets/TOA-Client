import { useNavigate, Link } from "react-router-dom";
import "../../styles/Navbar.css";
// import { ShimmerButton } from "../../components/ui/shimmer-button";
import { Button } from "../../components/ui/button";
import {  Droplet } from "lucide-react";
import { useNetwork } from "../../lib/network/NetworkContext";



const Navbar = () => {

  const navigate = useNavigate();
  const { networkPath } = useNetwork();

  const handleGetUsdcClick = async () => {
    navigate(networkPath('/faucet'));
  };

  return (
    <header className="max-w-7xl mx-auto px-6 sticky top-0 z-50 p-5 bg-transparent transition-all duration-300">
      <div className="flex flex-row justify-between">
        <div className="flex flex-row justify-between">
          {/* Logo */}
          <div className="navbar-logo">
            <img src="/ALogo-removebg-preview.svg" alt="Openassets" onClick={() => navigate(networkPath('/'))} className="h-20 w-20 rounded-full object-cover hover:shadow-xs cursor-pointer" />
          </div>

          {/* Navigation Links */}
          <nav className="navbar-nav ml-1">
            {/* <Link
              to={networkPath('/Changelog')}
              className="nav-link underline-animation underline-animation-purple"
            >
              <p className="font-extrabold text-2xl font-beau">Changelog</p>
            </Link> */}

            <Link to={networkPath('/about')} className="nav-link underline-animation underline-animation-purple">
              <p className="font-extrabold text-2xl font-beau">About</p>
            </Link>
            
            

          </nav>
        </div>

        {/* CTA Button */}
        <div className="flex items-center gap-4">

          <Button
            onClick={handleGetUsdcClick}
            className="hover:scale-[1.02] transition-transform rounded-3xl border-2 border-neutral-500 bg-neutral-200/80"
          >
            <Droplet className="w-4 h-4" />

            {'Faucet'}
          </Button>
         
        </div>
      </div>
    </header>
  );
};

export default Navbar;


