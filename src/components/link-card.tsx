import { Link } from '@/config/profile';

export function LinkCard({ href, title }: Link) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="flex text-lg items-center p-4 bg-glass backdrop-blur-md w-full md:w-[70%] rounded-xl hover:scale-105 hover:bg-glass transition-[transform,background-color] duration-200 ease-out border border-glass-border shadow-[inset_0_1px_0_0_var(--color-glass-hairline)] mb-3 active:scale-[0.98]"
    >
      <div className="flex flex-col text-center w-full">
        <h2 className="text-xl text-brand-text">{title}</h2>
      </div>
    </a>
  );
}
