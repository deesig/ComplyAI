import { redirect } from 'next/navigation';

export default function Home() {
  return (
    <>
      <AppHeader />
      <main>
        <WelcomePage />
      </main>
      <AppFooter />
    </>
  );
}
