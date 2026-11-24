import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trans, useTranslation } from 'react-i18next'
import { WHAT_WE_DO_TABS } from './content'
import { EYEBROW, SECTION_TITLE } from './cta'

/** "How it works" — one tab per part of the service, each a paragraph beside a photo. */
export function WhatWeDoSection() {
  const { t } = useTranslation('site')
  return (
    <section id="what-we-do" className="scroll-mt-6 bg-white py-16 lg:py-[100px]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="mx-auto mb-12 max-w-[750px] text-center">
          <div className={EYEBROW}>{t('whatWeDo.eyebrow')}</div>
          <h2 className={SECTION_TITLE}>
            <Trans t={t} i18nKey="whatWeDo.title" components={{ hl: <span className="text-brand-light" /> }} />
          </h2>
          <p className="mt-6 text-lg text-black/70">{t('whatWeDo.lead')}</p>
        </div>

        <Tabs
          defaultValue={WHAT_WE_DO_TABS[0].id}
          className="gap-0 rounded-xl bg-white px-3 pt-3 shadow-[0_0_70px_#0000000d]"
        >
          <TabsList className="grid h-auto! w-full grid-cols-1 gap-2 rounded-xl bg-[#f9f9f9] p-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {WHAT_WE_DO_TABS.map(({ id, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="h-auto justify-start gap-3 rounded-xl px-3 py-3 text-left text-base font-extrabold whitespace-normal text-black data-active:bg-white data-active:shadow-sm"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand p-3 text-white">
                  <Icon className="size-5" />
                </span>
                {t(`whatWeDo.tabs.${id}.title`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {WHAT_WE_DO_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="px-2 py-10 sm:px-6 lg:py-14">
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div>
                  <h3 className="mb-4 text-[30px] font-bold leading-[1.2] tracking-[-0.02em] text-black lg:text-[44px]">
                    {t(`whatWeDo.tabs.${tab.id}.title`)}
                  </h3>
                  <p className="text-base leading-relaxed text-black/70 lg:text-lg">{t(`whatWeDo.tabs.${tab.id}.body`)}</p>
                </div>
                <img
                  src={tab.photo}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
