import { useNavigate } from "react-router-dom";
import { ShaderAnimation } from "./shimmer-lines";
import { Button } from "./button";

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Background Animation */}
      <div className="absolute inset-0 z-0">
        <ShaderAnimation />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center px-4">
        <h1 className="text-[120px] md:text-[180px] font-bold text-white leading-none tracking-tighter select-none drop-shadow-2xl">
          404
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-10 font-light tracking-[0.2em] uppercase">
         Looks like we have a curious wanderer !
        </p>

        <Button
          onClick={() => navigate("/")}
          variant="outline"
          size="lg"
          className="bg-black/20 border-white/30 text-white hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-md min-w-[200px]"
        >
          Let's get you back to home
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;