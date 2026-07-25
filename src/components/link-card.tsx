import { Link } from '@/config/profile';

export function LinkCard({ href, title }: Link) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="flex text-lg items-center p-4 bg-white/5 backdrop-blur-md w-full md:w-[70%] rounded-xl hover:scale-105 hover:bg-white/10 transition-[transform,background-color] duration-200 ease-out border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] mb-3 active:scale-[0.98]"
    >
      <div className="flex flex-col text-center w-full">
        <h2 className="text-xl text-brand-text">{title}</h2>
      </div>
    </a>
  );
}
