import GalaxyBackgroundLazy from '@/components/GalaxyBackgroundLazy';
import Particles from '@/components/ui/particles';

export default function HomePage() {
  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col lg:flex-row bg-brand-bg overflow-hidden">
      <Particles
        className="absolute inset-0 w-full h-full z-0"
        quantity={250}
        staticity={10}
        ease={60}
        color="#ffffff"
      />

      <div className="w-full lg:w-1/2 flex items-center px-8 lg:px-16 pt-28 lg:pt-0 z-10 animate-hero-enter">
        <div className="w-full">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 lg:mb-6 text-brand-accent leading-tight font-serif">
            welcome to my place on the internet
          </h1>
          <p className="text-2xl text-brand-text leading-relaxed">
            hi, i&apos;m jordi, tech and science lover, living in the hyperreality making web products for the real life.
          </p>
        </div>
      </div>

      <div className="flex-1 lg:w-1/2 relative z-10 animate-fade-in">
        <GalaxyBackgroundLazy />
      </div>
    </div>
  );
}
