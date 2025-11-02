// OpenAI-style Progress Text Animation Component
const ProgressText = ({ text, className = "" }) => {
  if (!text || typeof text !== "string") return null;

  return (
    <>
      <style>
        {`
              @keyframes gradient-flow {
                0% {
                  background-position: -300% 0;
                }
                100% {
                  background-position: 300% 0;
                }
              }
              .progress-text {
                background: linear-gradient(
                  110deg,
                  #9ca3af 0%,
                  #6b7280 25%,
                  #4b5563 35%,
                  #374151 45%,
                  #1f2937 55%,
                  #374151 65%,
                  #4b5563 75%,
                  #6b7280 85%,
                  #9ca3af 100%
                );
                background-size: 300% 100%;
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: gradient-flow 6s linear infinite;
                font-weight: 500;
                letter-spacing: 0.01em;
              }
              .progress-container {
                position: relative;
                overflow: hidden;
              }
              .progress-dots::before,
              .progress-dots::after {
                content: '';
                position: absolute;
                top: 50%;
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: #9ca3af;
                animation: dot-pulse 1.5s ease-in-out infinite;
                transform: translateY(-50%);
              }
              .progress-dots::before {
                left: -12px;
                animation-delay: 0s;
              }
              .progress-dots::after {
                right: -12px;
                animation-delay: 0.75s;
              }
              @keyframes dot-pulse {
                0%, 100% {
                  opacity: 0.3;
                  transform: translateY(-50%) scale(0.8);
                }
                50% {
                  opacity: 1;
                  transform: translateY(-50%) scale(1.2);
                }
              }
            `}
      </style>
      <div className={`progress-container progress-dots ${className}`}>
        <span className="progress-text">{text}</span>
      </div>
    </>
  );
};

export default ProgressText;
