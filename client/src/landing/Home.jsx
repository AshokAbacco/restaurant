// ==============================================
// src/landing/Home.jsx
// ==============================================
//
// The homepage is only an order of sections. Every section owns its own
// markup and reads its own copy from landing.config.js, so re-ordering
// the page — or dropping a section for a campaign — is a change to this
// one list.
//
// The order answers the questions an owner asks, in the order they ask
// them: what is it, what happens during a service, how do orders work,
// how do tables work, what else is in the box, how do I start.

import { useEffect } from "react";

import { BRAND } from "./landing.config";
import Hero from "./sections/Hero";
import LiveRail from "./sections/LiveRail";
import ServiceStory from "./sections/ServiceStory";
import MenuOrdering from "./sections/MenuOrdering";
import TableFloor from "./sections/TableFloor";
import Modules from "./sections/Modules";
import CallToAction from "./sections/CallToAction";
import KitchenOrders from "./pages/Kitchenorders";
import BillingPayments from "./pages/Billingpayments";
import Crm from "./pages/Crm";
import Loyalty from "./pages/Loyalty";
const Home = () => {
  // Set here rather than in index.html, which the admin app shares.
  useEffect(() => {
    document.title = `${BRAND.name} — ${BRAND.tag}`;
  }, []);

  return (
    <>
      <Hero />
      <LiveRail />
      <ServiceStory />
      <MenuOrdering />
      <TableFloor />
      <KitchenOrders />
      <BillingPayments/>
      <Crm />
      <Loyalty />
      <Modules />
      <CallToAction />
    </>
  );
};

export default Home;
