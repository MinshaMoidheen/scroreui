import ContentSection from '../components/content-section'
import ProfileForm from './profile-form'

export default function SettingsProfile() {
  return (
    <ContentSection
      title='Profile'
      desc='Update your profile information.'
    >
      <ProfileForm />
    </ContentSection>
  )
}
