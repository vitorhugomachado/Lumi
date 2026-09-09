import Image from "next/image";
export function Mascot({ className = "" }: { className?: string }) {
  return (
    <Image
      className={`mascot ${className}`}
      src="/lumi/lumi.png"
      alt="Lumi, uma criaturinha amarela sorridente com antenas e olhos roxos"
      width={512}
      height={512}
      priority
    />
  );
}
