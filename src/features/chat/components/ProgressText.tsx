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
                  #fcd34d 0%,
                  #fbbf24 25%,
                  #f59e0b 35%,
                  #d97706 45%,
                  #b45309 55%,
                  #d97706 65%,
                  #f59e0b 75%,
                  #fbbf24 85%,
                  #fcd34d 100%
                );
                background-size: 300% 100%;
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: gradient-flow 4s linear infinite;
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
                background: #fcd34d;
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
