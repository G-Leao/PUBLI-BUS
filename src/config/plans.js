export const PLANS = {
  FREE: {
    id: "FREE",
    name: "Free",
    price: 0,
    description: "Para começar a organizar sua operação.",
    advertisersLimit: 3,
    campaignsLimit: 5,
    tabletsLimit: 2,
    reports: "Básico",
    analytics: "Básico",
    benefits: ["Gestão de anunciantes", "Gestão de campanhas", "Dashboard básico"],
  },
  PLUS: {
    id: "PLUS",
    name: "Plus",
    // ALTERAR PREÇO DO PLUS AQUI
    price: 29.9,
    description: "Mais controle para operações em crescimento.",
    advertisersLimit: 20,
    campaignsLimit: 30,
    tabletsLimit: 10,
    reports: "Completo",
    analytics: "Básico",
    popular: true,
    benefits: ["Até 20 anunciantes", "Até 30 campanhas", "Até 10 tablets", "Relatórios completos"],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    // ALTERAR PREÇO DO PRO AQUI
    price: 59.9,
    description: "Performance e suporte para grandes operações.",
    advertisersLimit: null,
    campaignsLimit: null,
    tabletsLimit: 50,
    reports: "Completo",
    analytics: "Avançado",
    benefits: ["Anunciantes ilimitados", "Campanhas ilimitadas", "Até 50 tablets", "Suporte prioritário"],
  },
};

export const formatPlanPrice = (price) =>
  price === 0 ? "R$ 0" : price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const getPlan = (id) => PLANS[String(id || "FREE").toUpperCase()] || PLANS.FREE;
