import { HERO } from './content'
import { ctaClass } from './cta'

/**
 * Full-viewport dark hero, content anchored to the bottom (Webflow `.hero-section`).
 *
 * The live site plays a stock background video with `hue-rotate(180deg)`. It is
 * referenced from /site/hero.{mp4,webm}; when the file is absent the <video> renders
 * nothing and the gradient + line pattern beneath it carry the section on their own.
 */
export function HeroSection() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-[#0B1C2C] pt-[175px] pb-16 text-white lg:pt-[200px]"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_top_right,#169f9655,transparent_60%),radial-gradient(ellipse_at_bottom_left,#2830b340,transparent_55%)]"
      />
      <video
        aria-hidden
        className="absolute inset-0 -z-20 h-full w-full object-cover hue-rotate-180"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/site/hero.mp4" type="video/mp4" />
        <source src="/site/hero.webm" type="video/webm" />
      </video>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[url('/site/hero-pattern.webp')] bg-cover bg-top opacity-60"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-2 lg:gap-x-20 xl:gap-x-40">
          <h1 className="text-[44px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-6xl lg:text-[72px] xl:text-[84px]">
            {HERO.title}
          </h1>
          <div className="flex flex-col gap-8">
            <p className="text-lg leading-relaxed text-white/85 sm:text-xl">{HERO.body}</p>
            <div className="flex flex-wrap gap-4">
              <a href="#what-we-do" className={ctaClass('light')}>
                About Us
              </a>
              <a href="#contact" className={ctaClass('brand')}>
                Talk to an Expert
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
