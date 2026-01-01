
import { LeverageForm } from '../../../components/leverage/LeverageForm';
import { PositionsTable } from '../../../components/leverage/PositionsTable';
import { PositionStats } from '../../../components/leverage/PositionStats';
import HeroBackground from '../../landing/HeroBackground';
import Navbar from '../../../components/common/Navbar';

const BorrowPage = () => {
  return (
    <div className="min-h-screen bg-[#f6fbff] overflow-x-hidden">
      <HeroBackground />
      
      {/* Navbar Container */}
      <div className="relative z-50 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-6">
          <Navbar />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8 z-40 relative">
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Leverage & Borrow</h1>
            <p className="text-muted-foreground">
              Use your mETH as collateral to access liquidity and amplify your RWA positions.
            </p>
          </div>

          <PositionStats />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <LeverageForm />
            </div>
            <div className="lg:col-span-2">
              <PositionsTable />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowPage;