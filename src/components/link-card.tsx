import { Link } from '@/config/profile';

export function LinkCard({ href, title }: Link) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="flex text-lg items-center p-4 bg-gray-800 bg-opacity-30 backdrop-filter backdrop-blur-sm w-full md:w-[70%] rounded-md hover:scale-105 transition-all border border-gray-600 mb-3 duration-300"
    >
      <div className="flex flex-col text-center w-full">
        <h2 className="text-2xl text-gray-100">{title}</h2>
      </div>
    </a>
  );
}
