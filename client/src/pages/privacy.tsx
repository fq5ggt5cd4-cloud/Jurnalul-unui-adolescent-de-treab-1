import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";

export default function PrivacyPolicy() {
  const { t } = useLang();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl prose prose-lg">
        <h1 className="text-4xl font-hand font-bold text-primary mb-8">
          {t('privacy.title')}
        </h1>
        <p className="text-muted-foreground mb-4">
          {t('privacy.updated')} {new Date().toLocaleDateString("ro-RO")}
        </p>

        <h2>{t('privacy.s1.title')}</h2>
        <p>{t('privacy.s1.text')}</p>

        <h2>{t('privacy.s2.title')}</h2>
        <p>{t('privacy.s2.text')}</p>
        <ul>
          <li>{t('privacy.s2.i1')}</li>
          <li>{t('privacy.s2.i2')}</li>
          <li>{t('privacy.s2.i3')}</li>
          <li>{t('privacy.s2.i4')}</li>
        </ul>

        <h2>{t('privacy.s3.title')}</h2>
        <p>{t('privacy.s3.text')}</p>
        <ul>
          <li>{t('privacy.s3.i1')}</li>
          <li>{t('privacy.s3.i2')}</li>
          <li>{t('privacy.s3.i3')}</li>
          <li>{t('privacy.s3.i4')}</li>
        </ul>

        <h2>{t('privacy.s4.title')}</h2>
        <p>{t('privacy.s4.text')}</p>
        <ul>
          <li>{t('privacy.s4.i1')}</li>
          <li>{t('privacy.s4.i2')}</li>
        </ul>

        <h2>{t('privacy.s5.title')}</h2>
        <p>{t('privacy.s5.text')}</p>

        <h2>{t('privacy.s6.title')}</h2>
        <p>{t('privacy.s6.text')}</p>

        <h2>{t('privacy.s7.title')}</h2>
        <p>{t('privacy.s7.text')}</p>
        <ul>
          <li>{t('privacy.s7.i1')}</li>
          <li>{t('privacy.s7.i2')}</li>
          <li>{t('privacy.s7.i3')}</li>
        </ul>

        <h2>{t('privacy.s8.title')}</h2>
        <p>{t('privacy.s8.text')}</p>

        <h2>{t('privacy.s9.title')}</h2>
        <p>{t('privacy.s9.text')}</p>
      </div>
    </Layout>
  );
}
