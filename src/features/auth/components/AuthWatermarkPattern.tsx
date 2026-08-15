export const AuthWatermarkPattern = () => (
  <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-10 select-none">
    <svg
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 900 900"
      preserveAspectRatio="none"
    >
      <g stroke="#405189" strokeWidth="1.2" fill="none">
        {/* Kanban Wireframe Columns */}
        <rect x="60" y="80" width="200" height="340" rx="14" strokeDasharray="6 6" />
        <rect x="290" y="80" width="200" height="440" rx="14" />
        <rect x="520" y="80" width="200" height="300" rx="14" strokeDasharray="6 6" />

        {/* Kanban Task Cards */}
        <rect x="80" y="110" width="160" height="75" rx="8" fill="#405189" fillOpacity="0.03" />
        <rect x="80" y="200" width="160" height="95" rx="8" fill="#405189" fillOpacity="0.03" />

        <rect x="310" y="110" width="160" height="85" rx="8" fill="#405189" fillOpacity="0.05" />
        <rect x="310" y="215" width="160" height="120" rx="8" fill="#405189" fillOpacity="0.05" />
        <rect x="310" y="350" width="160" height="85" rx="8" fill="#405189" fillOpacity="0.05" />

        <rect x="540" y="110" width="160" height="110" rx="8" fill="#405189" fillOpacity="0.03" />
        <rect x="540" y="240" width="160" height="75" rx="8" fill="#405189" fillOpacity="0.03" />

        {/* Sprint Velocity & Network Connection Curves */}
        <path
          d="M 80 620 Q 240 520 400 640 T 720 540 T 820 480"
          strokeWidth="2.5"
          stroke="#405189"
        />
        <path
          d="M 80 700 L 260 580 L 440 660 L 620 520 L 800 600"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          stroke="#3577f1"
        />

        {/* Nodes */}
        <circle cx="80" cy="620" r="6" fill="#405189" />
        <circle cx="400" cy="640" r="8" fill="#405189" />
        <circle cx="720" cy="540" r="6" fill="#405189" />
        <circle cx="820" cy="480" r="7" fill="#405189" />

        <circle cx="80" cy="700" r="5" fill="#3577f1" />
        <circle cx="260" cy="580" r="5" fill="#3577f1" />
        <circle cx="440" cy="660" r="5" fill="#3577f1" />
        <circle cx="620" cy="520" r="5" fill="#3577f1" />
        <circle cx="800" cy="600" r="5" fill="#3577f1" />
      </g>
    </svg>
  </div>
);
