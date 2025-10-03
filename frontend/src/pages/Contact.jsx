import Layout from '../components/Layout'
import { useLang } from '../context/LanguageContext'

export default function Contact() {
  const { t } = useLang()
  return (
    <Layout>
      <div className="max-w-3xl mx-auto glass-card ind-gradient-border p-6 rounded ind-card animate-slide-up">
        <div className="text-xl font-semibold mb-2 text-saffron-800">{t('contact_title')}</div>
        <div className="space-y-2 text-gray-700">
          <div className="font-semibold">{t('faqs')}</div>
          <ul className="list-disc ml-5">
            <li>{t('faq_q1')} {t('faq_a1')}</li>
            <li>{t('faq_q2')} {t('faq_a2')}</li>
          </ul>
          <div className="font-semibold mt-4">{t('emergency_helplines')}</div>
          <ul className="list-disc ml-5">
            <li>{t('medical_emergency')}: 108</li>
            <li>{t('police')}: 100</li>
            <li>{t('temple_security')}: Check temple info section</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
