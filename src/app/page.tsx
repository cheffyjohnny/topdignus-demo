import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Products from "@/components/Products";
import References from "@/components/References";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import DemoBanner from "@/components/DemoBanner";

export default function Home() {
  return (
    <>
      <DemoBanner />
      <Navbar />
      <main>
        <Hero />
        <Products />
        <References />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
