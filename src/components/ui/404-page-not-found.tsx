import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] relative overflow-hidden">
      <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center">
        {/* 404 Illustration */}
        <div className="w-full max-w-2xl mb-12">
          <svg
            viewBox="0 0 1200 600"
            className="w-full h-auto"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Sun/Moon in top right */}
            <g>
              <circle cx="950" cy="120" r="40" fill="#3B82F6" opacity="0.9" />
              <circle cx="1000" cy="120" r="40" fill="#E5E7EB" opacity="0.6" />
            </g>

            {/* Mountains background */}
            <g stroke="#D1D5DB" strokeWidth="2" fill="none">
              {/* Left mountain */}
              <path d="M 100 450 Q 200 250, 350 350 Q 450 400, 500 450" />
              {/* Middle mountain */}
              <path d="M 300 450 Q 400 200, 600 300 Q 700 350, 800 450" />
              {/* Right mountain */}
              <path d="M 700 450 Q 850 280, 1000 380 Q 1080 420, 1150 450" />
              {/* Curved line arc */}
              <path d="M 300 150 Q 600 100, 900 150" />
            </g>

            {/* Ground line */}
            <line x1="100" y1="500" x2="1100" y2="500" stroke="#D1D5DB" strokeWidth="2" />

            {/* 404 Text */}
            <g>
              {/* First "4" */}
              <text
                x="300"
                y="480"
                fontSize="200"
                fontWeight="600"
                fill="#374151"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                4
              </text>

              {/* Location Pin "0" */}
              <g transform="translate(600, 380)">
                {/* Outer pin shape */}
                <path
                  d="M 0,-80 C -45,-80 -80,-45 -80,0 C -80,35 -40,70 0,120 C 40,70 80,35 80,0 C 80,-45 45,-80 0,-80 Z"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="8"
                  strokeLinejoin="round"
                />

                {/* Inner circle/grid */}
                <circle cx="0" cy="-10" r="40" fill="none" stroke="#374151" strokeWidth="6" />
                <line x1="-40" y1="-10" x2="40" y2="-10" stroke="#374151" strokeWidth="2" />
                <line x1="0" y1="-50" x2="0" y2="30" stroke="#374151" strokeWidth="2" />
                <line x1="-28" y1="-38" x2="28" y2="18" stroke="#374151" strokeWidth="2" />
                <line x1="-28" y1="18" x2="28" y2="-38" stroke="#374151" strokeWidth="2" />

                {/* Blue leaves/plant decoration */}
                <g transform="translate(0, 10)">
                  {/* Center leaf */}
                  <ellipse cx="0" cy="-5" rx="12" ry="20" fill="#3B82F6" transform="rotate(-10 0 -5)" />
                  {/* Left leaf */}
                  <ellipse cx="-15" cy="0" rx="10" ry="18" fill="#2563EB" transform="rotate(-30 -15 0)" />
                  {/* Right leaf */}
                  <ellipse cx="15" cy="0" rx="10" ry="18" fill="#1D4ED8" transform="rotate(30 15 0)" />
                  {/* Small accent leaves */}
                  <ellipse cx="-8" cy="-8" rx="6" ry="12" fill="#60A5FA" transform="rotate(-20 -8 -8)" />
                  <ellipse cx="8" cy="-8" rx="6" ry="12" fill="#60A5FA" transform="rotate(20 8 -8)" />
                </g>

                {/* Pin bottom circle */}
                <circle cx="0" cy="50" r="8" fill="#374151" />
              </g>

              {/* Second "4" */}
              <text
                x="750"
                y="480"
                fontSize="200"
                fontWeight="600"
                fill="#374151"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                4
              </text>
            </g>
          </svg>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center text-center space-y-6 mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-[#1f2937]">
            Page Not Found
          </h1>
          <p className="text-base md:text-lg text-[#6b7280] max-w-md">
            Sorry, the page you are looking for could not be found.
          </p>
        </div>

        {/* Return Home Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-8 py-3.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-base font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Return Home</span>
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
