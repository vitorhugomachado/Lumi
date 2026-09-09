export function MicrophoneButton({
  active,
  onClick,
  mock = true,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  mock?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className="microphone"
      onClick={onClick}
      disabled={disabled}
      aria-label={
        active
          ? "Parar conversa"
          : mock
            ? "Conversar com Lumi (simulação)"
            : "Conversar com Lumi por voz"
      }
    >
      {active ? (
        <span className="stop-icon" />
      ) : (
        <svg
          width="28"
          height="32"
          viewBox="0 0 24 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="8" y="2" width="8" height="15" rx="4" />
          <path d="M4 12v2a8 8 0 0 0 16 0v-2M12 22v4M8 26h8" />
        </svg>
      )}
    </button>
  );
}
