"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import * as XLSX from "xlsx";

import { useRegulacaoData } from "./hooks/useRegulacaoData";
import { useRegulacaoFilters } from "./hooks/useRegulacaoFilters";

import FiltersBar from "./components/FiltersBar";
import Dashboard from "./views/Dashboard";
import NovoPedido from "./views/NovoPedido";
import ListaEspera from "./views/ListaEspera";
import Liberados from "./views/Liberados";
import Financeiro from "./views/Financeiro";
import TelaLiberarPedido from "./components/LiberarPedido";
import TelaEditarPedido from "./components/EditarPedido";

import ModalTetoFinanceiro from "./components/Modals/ModalTetoFinanceiro";
import ModalSeletorCotas from "./components/Modals/ModalSeletorCotas";

import styles from "./page.module.css";

function RegulacaoPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = searchParams.get("tab") || "DASHBOARD";

  const handleSetActiveTab = (tab, subTab) => {
    if (subTab) {
      router.push(`/regulacao?tab=${tab}&subTab=${subTab}`);
    } else {
      router.push(`/regulacao?tab=${tab}`);
    }
  };

  const data = useRegulacaoData((tab) => handleSetActiveTab(tab));
  const { filters, handleFilterChange, clearFilters, applyFilters } =
    useRegulacaoFilters();

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const availableProcedures = data.auxData.procedimentos.filter(
    (p) => String(p.tipoExameId) === String(data.newRequest.examTypeId),
  );

  const activeExamName =
    activeTab === "LISTA_ESPERA"
      ? data.selectedQueueExam
      : activeTab === "LIBERADOS"
        ? data.selectedReleasedExam
        : "";

  const activeExamObj = data.auxData.tiposExame.find(
    (t) =>
      t.nome?.toLowerCase() === activeExamName?.toLowerCase() ||
      String(t.id) === String(activeExamName),
  );

  const allProceduresList = data.auxData.procedimentos
    .filter((p) => {
      if (!activeExamObj) return true;
      return String(p.tipoExameId) === String(activeExamObj.id);
    })
    .map((p) => p.nome);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Regulação Saúde</h1>
        <p>Gestão de solicitações de exames, fila de espera e liberações.</p>
      </header>

      {(activeTab === "LISTA_ESPERA" || activeTab === "LIBERADOS") && (
        <FiltersBar
          filters={filters}
          handleFilterChange={handleFilterChange}
          clearFilters={clearFilters}
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          allProceduresList={allProceduresList}
          filtrosFixos={activeTab === "LISTA_ESPERA" || activeTab === "LIBERADOS"}
        />
      )}

      {activeTab === "DASHBOARD" && (
        <Dashboard
          requests={data.requests}
          auxData={data.auxData}
          setActiveTab={(tab) => handleSetActiveTab(tab)}
        />
      )}

      {activeTab === "NOVO_PEDIDO" && (
        <NovoPedido
          newRequest={data.newRequest}
          setNewRequest={data.setNewRequest}
          handleCreateRequest={data.handleCreateRequest}
          auxData={data.auxData}
          availableProcedures={availableProcedures}
          patientSuggestions={data.patientSuggestions}
          showSuggestions={data.showSuggestions}
          isSearchingPatient={data.isSearchingPatient}
          autocompleteRef={data.autocompleteRef}
          handlePatientSearchChange={data.handlePatientSearchChange}
          handleInputFocus={data.handleInputFocus}
          handleSearchPatientManual={data.handleSearchPatientManual}
          handleSelectPatientSuggestion={data.handleSelectPatientSuggestion}
          handleExamTypeChange={data.handleExamTypeChange}
          handleProcedureChange={data.handleProcedureChange}
        />
      )}

      {activeTab === "LISTA_ESPERA" && (
        <ListaEspera
          auxData={data.auxData}
          requests={data.requests}
          selectedQueueExam={data.selectedQueueExam}
          setSelectedQueueExam={data.setSelectedQueueExam}
          applyFilters={applyFilters}
          handleUpdateCommunicationDate={data.handleUpdateCommunicationDate}
          handleOpenReleaseModal={data.handleOpenReleaseModal}
          handleEditOrder={data.handleEditOrder}
          reloadData={data.reloadData}
          loading={data.loading}
        />
      )}

      {activeTab === "EDITAR_PEDIDO" && (
        <TelaEditarPedido
          editingItem={data.editingItem}
          setEditingItem={data.setEditingItem}
          auxData={data.auxData}
          handleEditStatusChange={data.handleEditStatusChange}
          handleSaveEditedOrder={data.handleSaveEditedOrder}
          onBack={() => {
            data.setEditingItem(null);
            handleSetActiveTab("LISTA_ESPERA");
          }}
          styles={styles}
        />
      )}

      {activeTab === "LIBERAR_PEDIDO" && (
        <TelaLiberarPedido
          releasingItem={data.releasingItem}
          regulationForm={data.regulationForm}
          setRegulationForm={data.setRegulationForm}
          auxData={data.auxData}
          handleSelectQuotaType={data.handleSelectQuotaType}
          handleReleaseDateChange={data.handleReleaseDateChange}
          handleConfirmRelease={data.handleConfirmRelease}
          onBack={() => {
            data.setReleasingItem(null);
            handleSetActiveTab("LISTA_ESPERA");
          }}
          showQuotaModal={data.showQuotaModal}
          setShowQuotaModal={data.setShowQuotaModal}
          quotaModalType={data.quotaModalType}
          quotaModalYear={data.quotaModalYear}
          setQuotaModalYear={data.setQuotaModalYear}
          handleSelectMonthFromModal={data.handleSelectMonthFromModal}
          calculateMonthQuotaDetails={data.calculateMonthQuotaDetails}
          styles={styles}
        />
      )}

      {activeTab === "LIBERADOS" && (
        <Liberados
          auxData={data.auxData}
          requests={data.requests}
          selectedReleasedExam={data.selectedReleasedExam}
          setSelectedReleasedExam={data.setSelectedReleasedExam}
          applyFilters={applyFilters}
          handleUpdateBillingDate={data.handleUpdateBillingDate}
          handleEditOrder={data.handleEditOrder}
          loading={data.loading}
          handleExportToExcelReleased={(selectedIds) => {
            if (!selectedIds || selectedIds.length === 0)
              return alert("Selecione pelo menos um paciente liberado.");
            const selectedItems = data.requests.filter((r) =>
              selectedIds.includes(r.id),
            );
            const exportData = selectedItems.map((item) => ({
              "Código Regulação": item.id,
              "Nome do Paciente": item.patientName,
              CPF: item.cpf,
              "Cartão SUS": item.susCard || "Não informado",
              "Tipo de Exame": item.examType,
              Procedimento: item.procedure,
              "Data da Liberação": item.releaseDate || "Não informada",
              "Tipo de Cota": item.quota || "N/A",
              "Competência Cota":
                item.quotaCompetenceMonth && item.quotaCompetenceYear
                  ? `${item.quotaCompetenceMonth}/${item.quotaCompetenceYear}`
                  : "N/A",
              "Data Faturado": item.billingDate || "Não informada",
              "Médico Regulador": item.regulatorDoctor || "Não informado",
              "Médico Solicitante": item.requestDoctor || "Não informado",
              "UBS Solicitante": item.requestUbs || "Não informada",
              "Valor do Exame (R$)": item.estimatedCost
                ? item.estimatedCost.toFixed(2)
                : "0.00",
            }));
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(
              workbook,
              worksheet,
              "Exames Liberados",
            );
            XLSX.writeFile(
              workbook,
              `Liberados_${data.selectedReleasedExam.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`,
            );
          }}
        />
      )}

      {activeTab === "FINANCEIRO" && (
        <Financeiro
          finMonth={data.finMonth}
          setFinMonth={data.setFinMonth}
          finYear={data.finYear}
          setFinYear={data.setFinYear}
          calculateMonthQuotaDetails={data.calculateMonthQuotaDetails}
          handleOpenDefineTetoModal={data.handleOpenDefineTetoModal}
        />
      )}

      <ModalTetoFinanceiro
        editCotaModal={data.editCotaModal}
        setEditCotaModal={data.setEditCotaModal}
        handleSaveTetoCota={data.handleSaveTetoCota}
        finMonth={data.finMonth}
        finYear={data.finYear}
        styles={styles}
      />

      <ModalSeletorCotas
        open={data.showQuotaModal}
        onClose={() => data.setShowQuotaModal(false)}
        tipoCota={data.quotaModalType}
        anoAtual={data.quotaModalYear}
        setAnoAtual={data.setQuotaModalYear}
        onSelectMonth={data.handleSelectMonthFromModal}
        calculateMonthQuotaDetails={data.calculateMonthQuotaDetails}
        defaultMonth={data.regulationForm.quotaCompetenceMonth}
        styles={styles}
      />
    </div>
  );
}

export default function RegulacaoPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          Carregando página...
        </div>
      }
    >
      <RegulacaoPageContent />
    </Suspense>
  );
}