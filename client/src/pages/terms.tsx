import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";

export default function TermsOfService() {
  const { t } = useLang();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl prose prose-lg">
        <h1 className="text-4xl font-hand font-bold text-primary mb-8">
          {t('terms.title')}
        </h1>
        <p className="text-muted-foreground mb-4">
          {t('terms.updated')} {new Date().toLocaleDateString("ro-RO")}
        </p>

        <h2>{t('terms.s1.title')}</h2>
        <p>{t('terms.s1.text')}</p>

        <h2>{t('terms.s2.title')}</h2>
        <p>{t('terms.s2.text')}</p>

        <h2>{t('terms.s3.title')}</h2>
        <p>{t('terms.s3.text')}</p>
        <ul>
          <li>{t('terms.s3.i1')}</li>
          <li>{t('terms.s3.i2')}</li>
          <li>{t('terms.s3.i3')}</li>
        </ul>

        <h2>{t('terms.s4.title')}</h2>
        <p>{t('terms.s4.text')}</p>
        <ul>
          <li>{t('terms.s4.i1')}</li>
          <li>{t('terms.s4.i2')}</li>
          <li>{t('terms.s4.i3')}</li>
          <li>{t('terms.s4.i4')}</li>
          <li>{t('terms.s4.i5')}</li>
        </ul>

        <h2>{t('terms.s5.title')}</h2>
        <p>{t('terms.s5.text')}</p>

        <h2>{t('terms.s6.title')}</h2>
        <p>{t('terms.s6.text')}</p>

        <h2>{t('terms.s7.title')}</h2>
        <p>{t('terms.s7.text')}</p>

        <h2>{t('terms.s8.title')}</h2>
        <p>{t('terms.s8.text')}</p>

        <h2>{t('terms.s9.title')}</h2>
        <p>{t('terms.s9.text')}</p>

        <h2>{t('terms.s10.title')}</h2>
        <p>{t('terms.s10.text')}</p>
      </div>
    </Layout>
  );
}
