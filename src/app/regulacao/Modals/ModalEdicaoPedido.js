'use client';

import styles from './ModalEdicaoPedido.module.css';

export default function ModalEdicaoPedido({
  editingItem,
  setEditingItem,
  handleEditStatusChange,
  handleSaveEditedOrder,
  auxData
}) {
  if (!editingItem) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContentLarge} ${styles.modalMediumWidth}`}>
        <div className={styles.modalHeader}>
          <h3>Editar Registro de {editingItem.patientName}</h3>
          <button 
            type="button"
            onClick={() => setEditingItem(null)} 
            className={styles.closeBtn}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSaveEditedOrder} className={styles.modalReleaseForm}>
          <h4 className={styles.modalSectionTitle}>Informações Gerais do Paciente e Solicitação</h4>
          
          <div className={styles.releaseFieldsGrid}>
            <div className={styles.fieldGroup}>
              <label>Status *</label>
              <select 
                value={editingItem.status} 
                onChange={(e) => handleEditStatusChange(e.target.value)}
                required
              >
                <option value="Liberado">Liberado</option>
                <option value="Aguardando">Aguardando (Voltar para Fila de Espera)</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>CPF (Apenas Leitura)</label>
              <input 
                type="text" 
                value={editingItem.cpf} 
                readOnly 
                className={styles.readOnlyInput} 
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Nome da Mãe</label>
              <input 
                type="text" 
                value={editingItem.motherName || ''} 
                readOnly 
                className={styles.readOnlyInput} 
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Cartão SUS</label>
              <input 
                type="text" 
                value={editingItem.susCard || ''} 
                onChange={(e) => setEditingItem({ ...editingItem, susCard: e.target.value })} 
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Procedimento</label>
              <select 
                value={editingItem.procedureId || ''} 
                onChange={(e) => setEditingItem({ ...editingItem, procedureId: e.target.value })}
              >
                <option value="">-- Selecione Procedimento --</option>
                {auxData.procedimentos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Classificação de Risco</label>
              <select 
                value={editingItem.classification} 
                onChange={(e) => setEditingItem({ ...editingItem, classification: e.target.value })}
              >
                <option value="Verde">Verde (Eletivo)</option>
                <option value="Amarelo">Amarelo (Prioritário)</option>
                <option value="Vermelho">Vermelho (Urgente)</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Médico Solicitante</label>
              <select 
                value={editingItem.requestDoctorId || ''} 
                onChange={(e) => setEditingItem({ ...editingItem, requestDoctorId: e.target.value })}
              >
                <option value="">-- Selecione Médico Solicitante --</option>
                {auxData.medicos.filter(m => m.tipo !== 'Regulador').map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>UBS Solicitante</label>
              <select 
                value={editingItem.requestUbsId || ''} 
                onChange={(e) => setEditingItem({ ...editingItem, requestUbsId: e.target.value })}
              >
                <option value="">-- Selecione UBS --</option>
                {auxData.ubsList.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Médico Regulador</label>
              <select 
                value={editingItem.regulatorDoctorId || ''} 
                onChange={(e) => setEditingItem({ ...editingItem, regulatorDoctorId: e.target.value })}
                disabled={editingItem.status === 'Aguardando'}
              >
                <option value="">-- Selecione Médico Regulador --</option>
                {auxData.medicos.filter(m => m.tipo === 'Regulador').map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Tipo de Cota</label>
              <select 
                value={editingItem.quota || ''} 
                onChange={(e) => setEditingItem({ ...editingItem, quota: e.target.value })}
                disabled={editingItem.status === 'Aguardando'}
              >
                <option value="">-- Selecione Cota --</option>
                <option value="SUS">SUS</option>
                <option value="OCI">OCI</option>
                <option value="Credenciamento">Credenciamento</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Data da Liberação</label>
              <input 
                type="date" 
                value={editingItem.releaseDate || ''} 
                onChange={(e) => setEditingItem({ ...editingItem, releaseDate: e.target.value })}
                disabled={editingItem.status === 'Aguardando'} 
              />
            </div>

            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label>Observação / Quadro Clínico (Mantida)</label>
              <textarea 
                rows="3" 
                value={editingItem.justification || editingItem.generalObservation || ''} 
                onChange={(e) => setEditingItem({ 
                  ...editingItem, 
                  justification: e.target.value, 
                  generalObservation: e.target.value 
                })} 
              />
            </div>
          </div>

          <div className={styles.modalActions}>
            <button 
              type="button" 
              onClick={() => setEditingItem(null)} 
              className={styles.secondaryBtn}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.approveBtn}>
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}