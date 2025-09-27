import Image from "next/image";
import AppHeader from "./AppHeader";
import AppFooter from "./AppFooter";
import App from "next/app";
import WelcomePage from "./WelcomePage";


export default function Home() {
  return (
    <div>
      <AppHeader />
      <WelcomePage />
      <AppFooter />
    </div>
  );
}
