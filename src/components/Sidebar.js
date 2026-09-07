"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./Sidebar.module.css";

const menuSections = [
  {
    items: [
      {
        name: "Início / Módulos",
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
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
          </svg>
        ),
      },
    ],
  },
  {
    items: [
      {
        name: "Regulação de Exames",
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
          {
            name: "Cadastros",
            tab: "CADASTROS",
            isNestedDropdown: true,
            nestedItems: [
              { name: "Pacientes", subTab: "PESSOAS" },
              { name: "Médicos Solicitantes", subTab: "MEDICOS" },
              { name: "Unidades / UBS", subTab: "UBS" },
              { name: "Procedimentos", subTab: "PROCEDIMENTOS" },
            ],
          },
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
              { name: "Dispensação", subTab: "DISPENSACAO" },
              { name: "Estoque e Lotes", subTab: "ESTOQUE" },
              { name: "Relatórios", subTab: "RELATORIOS" },
            ],
          },
          {
            name: "Processos",
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
          { name: "Prontuário e Relatório", tab: "RELATORIO" },
          {
            name: "Serviços de Atendimento",
            tab: "SERVICOS",
            isNestedDropdown: true,
            nestedItems: [
              { name: "CAEE", subTab: "CAEE" },
              { name: "APAE", subTab: "APAE" },
              { name: "Ambulatório", subTab: "AMBULATORIO" },
              { name: "Educação", subTab: "EDUCACAO" },
              { name: "Social", subTab: "SOCIAL" },
              { name: "Centro de Especialidades", subTab: "ESPECIALIDADES" },
              { name: "Centro de Reabilitação", subTab: "REABILITACAO" },
            ],
          },
        ],
      },
    ],
  },
  {
    items: [
      {
        name: "CCZ - Zoonoses",
        path: "/ccz",
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
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        ),
        subItems: [
          { name: "Dashboard", tab: "DASHBOARD" },
          { name: "Cadastros", tab: "CADASTROS" },
          { name: "Usuários", tab: "USUARIOS" },
          { name: "Animais", tab: "ANIMAIS" },
          {
            name: "Zoonoses",
            tab: "ZOONOSES",
            isNestedDropdown: true,
            nestedItems: [
              { name: "Cadastrar Zoonose", subTab: "CADASTRO" },
              { name: "Exibir Zoonoses", subTab: "EXIBIR_ZOONOSES" },
            ],
          },
          {
            name: "Esporotricose",
            tab: "ESPOROTRICOSE",
            isNestedDropdown: true,
            nestedItems: [
              { name: "Cadastrar Esporotricose", subTab: "CADASTRO" },
              { name: "Exibir Esporotricose", subTab: "EXIBIR_ESPOROTRICOSE" },
            ],
          },
          { name: "Procedimentos", tab: "PROCEDIMENTOS" },
          { name: "Denúncias", tab: "DENUNCIAS" },
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6" />
            <path d="M22 11h-6" />
          </svg>
        ),
        subItems: [
          {
            name: "Gerenciar Usuários",
            path: "/admin/usuarios",
            tab: "USUARIOS",
          },
          {
            name: "Relatórios Gerais",
            path: "/relatorios",
            tab: "RELATORIOS",
          },
        ],
      },
    ],
  },
];

function MenuContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "DASHBOARD";
  const currentSubTab = searchParams.get("subTab") || "";

  const [openGroup, setOpenGroup] = useState({});
  const [openNested, setOpenNested] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const toggleGroup = (path) => {
    setOpenGroup((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const toggleNested = (tabKey) => {
    setOpenNested((prev) => ({ ...prev, [tabKey]: !prev[tabKey] }));
  };

  return (
    <aside className={styles.sidebar}>
      {/* HEADER DA SIDEBAR */}
      <div className={styles.sidebarHeader}>
        <div className={styles.brandLogo}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span className={styles.brandName}>Orion</span>
        </div>
      </div>

      {/* CAMPO DE BUSCA */}
      <div className={styles.searchContainer}>
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* LISTA NAVEGÁVEL */}
      <nav className={styles.menuContentList}>
        {menuSections.map((section, sIdx) => {
          const filteredItems = section.items.filter((item) => {
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
                  return (
                    <div key={item.path}>
                      <button
                        type="button"
                        className={styles.menuItemBtn}
                        onClick={() => toggleGroup(item.path)}
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
                          {item.subItems.map((sub) => {
                            if (sub.isNestedDropdown) {
                              const isNestedOpen =
                                Boolean(openNested[sub.tab]) ||
                                Boolean(searchTerm);

                              return (
                                <li key={sub.tab}>
                                  <button
                                    type="button"
                                    className={styles.nestedBtn}
                                    onClick={() => toggleNested(sub.tab)}
                                  >
                                    <span>{sub.name}</span>
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
                                              {nested.name}
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
                            const isSubActive =
                              (sub.path
                                ? pathname === sub.path
                                : pathname === item.path) &&
                              (!sub.path || currentTab === sub.tab);

                            return (
                              <li key={sub.tab}>
                                <Link
                                  href={subLink}
                                  className={`${styles.subMenuItemLink} ${
                                    isSubActive ? styles.activeLink : ""
                                  }`}
                                >
                                  {sub.name}
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
