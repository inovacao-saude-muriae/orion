"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import styles from "./Sidebar.module.css";

const menuSections = [
  {
    items: [
      {
        name: "Início",
        path: "/",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9.5 12 3l9 6.5" />
            <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
          </svg>
        ),
      },
    ],
  },
  {
    items: [
      {
        name: "Regulação",
        path: "/regulacao",
        isDropdown: true,
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
        subItems: [
          { name: "Dashboard", tab: "DASHBOARD" },
          { name: "Novo Pedido", tab: "NOVO_PEDIDO" },
          { name: "Lista de Espera", tab: "LISTA_ESPERA" },
          { name: "Liberados", tab: "LIBERADOS" },
          { name: "Financeiro", tab: "FINANCEIRO" },
        ],
      },
    ],
  },
  {
    items: [
      {
        name: "Câmara Técnica",
        path: "/camara-tecnica",
        isDropdown: true,
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
            <path d="m8.5 8.5 7 7" />
          </svg>
        ),
        subItems: [
          {
            name: "Farmácia Judicial",
            tab: "FARMACIA_JUDICIAL",
            path: "/camara-tecnica/farmacia-judicial",
            isNestedDropdown: true,
            nestedItems: [
              { name: "Dashboard", subTab: "DASHBOARD" },
              { name: "Pacientes", subTab: "PACIENTES" },
              { name: "Medicamentos", subTab: "MEDICAMENTOS" },
              { name: "Estoque", subTab: "ESTOQUE" },
              { name: "Dispensação", subTab: "DISPENSACAO" },              
              { name: "Relatórios", subTab: "RELATORIOS" },
            ],
          },
          {
            name: "Processos Judiciais",
            tab: "PROCESSOS",
            path: "/camara-tecnica/processos",
          },
        ],
      },
    ],
  },
  {
    items: [
      {
        name: "Junta Reguladora",
        path: "/junta-reguladora",
        isDropdown: true,
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
        subItems: [
          { name: "Cadastro de Paciente", tab: "CADASTRO" },
           {
            name: "Serviços",
            tab: "SERVICOS",
            isNestedDropdown: true,
            nestedItems: [
              { name: "CAEE", subTab: "CAEE" },
              { name: "APAE", subTab: "APAE" },
              { name: "Ambulatório", subTab: "AMBULATORIO" },       
              { name: "Centro de Especialidades", subTab: "ESPECIALIDADES" },
           
            ],
          },
          { name: "Prontuário e Relatório", tab: "RELATORIO" },
         
        ],
      },
    ],
  },
  {
    items: [
      {
        name: "Gerenciamento",
        path: "/admin/gerenciamento",
        isDropdown: true,
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        ),
        subItems: [
          {
            name: "Pacientes",
            path: "/gerenciamento/pessoas",
            tab: "PESSOAS",
          },
          {
            name: "Médicos",
            path: "/gerenciamento/medicos",
            tab: "MEDICOS",
          },
          {
            name: "Unidade Básica de Saúde",
            path: "/gerenciamento/ubs",
            tab: "UBS",
          },
          {
            name: "Procedimentos",
            path: "/gerenciamento/procedimentos",
            tab: "PROCEDIMENTOS",
          },
          {
            name: "Serviços e Especialidades",
            path: "/gerenciamento/servicos",
            tab: "SERVICOS",
          },
          {
            name: "Gerenciar Usuários",
            path: "/gerenciamento/usuarios",
            tab: "USUARIOS",
          },
          {
            name: "Relatórios Gerais",
            path: "/gerenciamento/relatorios",
            tab: "RELATORIOS",
          },
        ],
      },
    ],
  },
];

// Ícone pequeno para itens de submenu, escolhido por palavra-chave do nome.
function subIcon(nome = "") {
  const n = nome.toLowerCase();
  const props = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (n.includes("dashboard") || n.includes("painel"))
    return (
      <svg {...props}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
    );
  if (n.includes("novo pedido") || n.includes("cadastrar") || n.includes("cadastro") || n.includes("novo"))
    return (
      <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 12v6" /><path d="M9 15h6" /></svg>
    );
  if (n.includes("lista de espera") || n.includes("espera") || n.includes("exibir") || n.includes("lista"))
    return (
      <svg {...props}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
    );
  if (n.includes("liberad"))
    return (
      <svg {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
    );
  if (n.includes("financeiro") || n.includes("relatório") || n.includes("relatorio"))
    return (
      <svg {...props}><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
    );
  if (n.includes("paciente") || n.includes("pessoa") || n.includes("usuário") || n.includes("usuario") || n.includes("usuario"))
    return (
      <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
    );
  if (n.includes("prontuário") || n.includes("prontuario"))
    return (
      <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
    );
  if (n.includes("medicamento") || n.includes("dispensa") || n.includes("farmácia") || n.includes("farmacia"))
    return (
      <svg {...props}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></svg>
    );
  if (n.includes("estoque"))
    return (
      <svg {...props}><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
    );
  if (n.includes("médico") || n.includes("medico"))
    return (
      <svg {...props}><path d="M8 2v4" /><path d="M16 2v4" /><path d="M12 11v6" /><path d="M9 14h6" /><rect x="3" y="4" width="18" height="18" rx="2" /></svg>
    );
  if (n.includes("ubs") || n.includes("unidade") || n.includes("saúde") || n.includes("saude"))
    return (
      <svg {...props}><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /><path d="M12 13v4" /><path d="M10 15h4" /></svg>
    );
  if (n.includes("procedimento"))
    return (
      <svg {...props}><path d="M14.5 2 9 7.5l-7 7a2.12 2.12 0 0 0 3 3l7-7L17.5 5" /><path d="m14 7 3 3" /></svg>
    );
  // "Serviços de Atendimento" (Junta): grade de serviços oferecidos (CAEE, APAE, Ambulatório...).
  if (n.includes("serviços de atendimento") || n.includes("servicos de atendimento"))
    return (
      <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
    );
  // "Serviços e Especialidades" (Gerenciamento): mesma grade de serviços.
  // "Centro de Especialidades" usa o ponto genérico.
  if (n.includes("serviços e especialidades") || n.includes("servicos e especialidades"))
    return (
      <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
    );
  if (n.includes("animal") || n.includes("animais"))
    return (
      <svg {...props}><circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" /><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" /></svg>
    );
    if (n.includes("denúncia") || n.includes("denuncia") || n.includes("zoonoses")  || n.includes("esporotricose"))
    return (
      <svg {...props}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
    );
  if (n.includes("processo"))
    return (
      <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
    );
    if (n.includes("tutor"))
    return (
      <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
    );
  // Padrão genérico (ponto).
  return (
    <svg {...props}><circle cx="12" cy="12" r="4" /></svg>
  );
}

// A Sidebar NÃO filtra mais por papel: todos os módulos e sub-itens são
// exibidos para qualquer usuário autenticado (design §7.1 / AC-6). A
// autorização de acesso é feita no servidor (layout.js por módulo), que bloqueia
// NO CONTEÚDO via <AcessoNegadoModulo/>. Por isso não há mais chamada ao
// endpoint de sessão nem estado de role aqui.

function MenuContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams.get("tab") || "DASHBOARD";
  const currentSubTab = searchParams.get("subTab") || "";

  const [openGroup, setOpenGroup] = useState({});
  const [openNested, setOpenNested] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // Monta a URL da primeira aba (padrão) de um módulo, para "resetar" a posição
  // ao reabrir o módulo em vez de ficar na última aba acessada.
  const urlAbaInicial = (item) => {
    const primeiro = item.subItems?.[0];
    if (!primeiro) return item.path;
    // Link já pronto (ex.: Gerenciamento usa path próprio por item).
    if (primeiro.path) return primeiro.path;
    // Caso padrão: path do módulo + tab do primeiro sub-item.
    return `${item.path}?tab=${primeiro.tab}`;
  };

  const toggleGroup = (item) => {
    const path = item.path;
    const vaiAbrir = !openGroup[path];
    setOpenGroup((prev) => ({ ...prev, [path]: !prev[path] }));
    // Ao abrir o módulo, navega para a aba inicial (zera a posição anterior).
    // Exceção: se o primeiro item for um subgrupo (nestedDropdown), não navega —
    // apenas expande o menu (ex.: Câmara Técnica só mostra conteúdo ao clicar
    // em Farmácia Judicial).
    if (vaiAbrir && !item.subItems?.[0]?.isNestedDropdown) {
      router.push(urlAbaInicial(item));
    }
  };

  const toggleNested = (sub, itemPath) => {
    const tabKey = sub.tab;
    const vaiAbrir = !openNested[tabKey];
    setOpenNested((prev) => ({ ...prev, [tabKey]: !prev[tabKey] }));
    // Ao abrir o subgrupo, navega para o primeiro item dele (zera a posição).
    if (vaiAbrir) {
      const base = sub.path || itemPath;
      const primeiro = sub.nestedItems?.[0];
      if (primeiro) {
        router.push(`${base}?tab=${sub.tab}&subTab=${primeiro.subTab}`);
      }
    }
  };

  return (
    <aside className={styles.sidebar}>
      {/* HEADER DA SIDEBAR */}
      <div className={styles.sidebarHeader}>
        <div className={styles.brandLogo}>
          <Image
            src="/img/logos-orion/logo.png"
            alt="Orion — Plataforma de Gestão Integrada"
            width={480}
            height={150}
            quality={100}
            className={styles.brandImage}
            priority
          />
        </div>
      </div>

      {/* LISTA NAVEGÁVEL */}
      <nav className={styles.menuContentList}>
        {menuSections.map((section, sIdx) => {
          const filteredItems = section.items
            // Filtra apenas pelo termo de busca; sem recorte por papel (AC-6).
            .filter((item) => {
              if (!searchTerm) return true;
              const matchMain = item.name
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
              const matchSub = item.subItems?.some(
                (sub) =>
                  sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  sub.nestedItems?.some((nested) =>
                    nested.name.toLowerCase().includes(searchTerm.toLowerCase()),
                  ),
              );
              return matchMain || matchSub;
            });

          if (filteredItems.length === 0) return null;

          return (
            <div key={sIdx} className={styles.sectionGroup}>
              {filteredItems.map((item) => {
                const isDropdownOpen =
                  Boolean(openGroup[item.path]) || Boolean(searchTerm);

                if (item.isDropdown) {
                  // Todos os sub-itens são exibidos (sem recorte por papel).
                  const subItemsVisiveis = item.subItems || [];
                  if (subItemsVisiveis.length === 0) return null;

                  return (
                    <div key={item.path}>
                      <button
                        type="button"
                        className={styles.menuItemBtn}
                        data-state={isDropdownOpen ? "open" : "closed"}
                        onClick={() => toggleGroup(item)}
                        title={item.name}
                      >
                        <span className={styles.itemIcon}>{item.icon}</span>
                        <span className={styles.itemLabel}>{item.name}</span>
                        <svg
                          className={`${styles.arrowIcon} ${isDropdownOpen ? styles.arrowOpen : ""}`}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>

                      {isDropdownOpen && (
                        <ul className={styles.subMenuList}>
                          {subItemsVisiveis.map((sub) => {
                            if (sub.isNestedDropdown) {
                              const isNestedOpen =
                                Boolean(openNested[sub.tab]) ||
                                Boolean(searchTerm);

                              return (
                                <li key={sub.tab}>
                                  <button
                                    type="button"
                                    className={`${styles.nestedBtn} ${isNestedOpen ? styles.nestedBtnOpen : ""}`}
                                    onClick={() => toggleNested(sub, item.path)}
                                  >
                                    <span className={styles.subItemContent}>
                                      <span className={styles.subItemIcon}>{subIcon(sub.name)}</span>
                                      {sub.name}
                                    </span>
                                    <svg
                                      className={`${styles.arrowIcon} ${isNestedOpen ? styles.arrowOpen : ""}`}
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                  </button>

                                  {isNestedOpen && (
                                    <ul className={styles.nestedMenuList}>
                                      {sub.nestedItems.map((nested) => {
                                        const nestedLink = `${sub.path || item.path}?tab=${sub.tab}&subTab=${nested.subTab}`;
                                        const isNestedActive =
                                          pathname ===
                                            (sub.path || item.path) &&
                                          currentTab === sub.tab &&
                                          currentSubTab === nested.subTab;

                                        return (
                                          <li key={nested.subTab}>
                                            <Link
                                              href={nestedLink}
                                              className={`${styles.subMenuItemLink} ${
                                                isNestedActive
                                                  ? styles.activeLink
                                                  : ""
                                              }`}
                                            >
                                              <span className={styles.subItemContent}>
                                                <span className={styles.subItemIcon}>{subIcon(nested.name)}</span>
                                                {nested.name}
                                              </span>
                                            </Link>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </li>
                              );
                            }

                            const subLink =
                              sub.path || `${item.path}?tab=${sub.tab}`;
                            // Separa o path base da query (ex: /x?subTab=MEDICOS)
                            const [subBasePath, subQuery] = (sub.path || "").split("?");
                            const subQuerySubTab = new URLSearchParams(subQuery || "").get("subTab");
                            const isSubActive = sub.path
                              ? pathname === subBasePath &&
                                (!subQuerySubTab || currentSubTab === subQuerySubTab)
                              : pathname === item.path && currentTab === sub.tab;

                            return (
                              <li key={sub.tab}>
                                <Link
                                  href={subLink}
                                  className={`${styles.subMenuItemLink} ${
                                    isSubActive ? styles.activeLink : ""
                                  }`}
                                >
                                  <span className={styles.subItemContent}>
                                    <span className={styles.subItemIcon}>{subIcon(sub.name)}</span>
                                    {sub.name}
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                }

                const isActive = pathname === item.path;

                return (
                  <div key={item.path}>
                    <Link
                      href={item.path}
                      className={`${styles.menuItemBtn} ${isActive ? styles.activeLink : ""}`}
                      title={item.name}
                    >
                      <span className={styles.itemIcon}>{item.icon}</span>
                      <span className={styles.itemLabel}>{item.name}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={null}>
      <MenuContent />
    </Suspense>
  );
}
