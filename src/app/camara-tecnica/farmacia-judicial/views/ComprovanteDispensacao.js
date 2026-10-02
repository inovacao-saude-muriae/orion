"use client";

import styles from "./ComprovanteDispensacao.module.css";

export default function ComprovanteDispensacao({
  paciente,
  itens = [],
  responsavelEntrega,
  observacao,
  dataEntrega,
}) {
  if (!paciente) return null;

  return (
    <div className={styles.termoImpressao}>
      {/* 1ª VIA — FARMÁCIA */}
      <div className={styles.printVia}>
        <div className={styles.printCabecalho}>
          <div>
            <h1>Farmácia Judicial de Muriaé</h1>
            <p>Comprovante de Dispensação de Medicamentos</p>
          </div>
          <div className={styles.printMeta}>
            <span className={styles.printSelo}>1ª via — Farmácia</span>
            <span>Secretaria Municipal de Saúde</span>
            <span>Muriaé — MG</span>
          </div>
        </div>

        <div className={styles.printSecaoTitulo}>Dados do Paciente</div>
        <div className={styles.printDadosGrid}>
          <div className={styles.printDado}>
            <span className={styles.printLabel}>Paciente</span>
            <span className={styles.printValor}>{paciente.patientName}</span>
          </div>
          <div className={styles.printDado}>
            <span className={styles.printLabel}>CPF</span>
            <span className={styles.printValor}>{paciente.cpf || "—"}</span>
          </div>
          <div className={styles.printDado}>
            <span className={styles.printLabel}>Código / Pasta</span>
            <span className={styles.printValor}>{paciente.numeroPasta || "—"}</span>
          </div>
          <div className={styles.printDado}>
            <span className={styles.printLabel}>Data de entrega</span>
            <span className={styles.printValor}>{dataEntrega}</span>
          </div>
        </div>

        <div className={styles.printSecaoTitulo}>Medicamentos Dispensados</div>
        <table className={styles.printTable}>
          <thead>
            <tr>
              <th>Medicamento</th>
              <th className={styles.colCenter}>Qtd. dispensada</th>
              <th className={styles.colCenter}>Data de entrega</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={i}>
                <td>
                  <strong>{item.medicamentoNome}</strong> {item.dosagem}
                </td>
                <td className={styles.colCenter}>
                  <strong>{item.qtdEntregue}</strong>
                </td>
                <td className={styles.colCenter}>{dataEntrega}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {observacao && (
          <div className={styles.printObs}>
            <strong>Observações:</strong> {observacao}
          </div>
        )}

        <div className={styles.printAssinaturas}>
          <div className={styles.printAssinatura}>
            <div className={styles.printLinha}></div>
            <strong>{responsavelEntrega || "Servidor Responsável"}</strong>
            <div>Responsável pela entrega</div>
          </div>
          <div className={styles.printAssinatura}>
            <div className={styles.printLinha}></div>
            <strong>{paciente.patientName}</strong>
            <div>Paciente / Receptor</div>
          </div>
        </div>
      </div>

      <div className={styles.printRecorte}>
        ✂ RECORTE AQUI — COMPROVANTE DE ENTREGA DO PACIENTE
      </div>

      {/* 2ª VIA — PACIENTE */}
      <div className={styles.printVia}>
        <div className={styles.printCabecalho}>
          <div>
            <h2>Farmácia Judicial de Muriaé</h2>
            <p>Comprovante de Entrega de Medicamento</p>
          </div>
          <div className={styles.printMeta}>
            <span className={styles.printSelo}>2ª via — Paciente</span>
            <span>Data: {dataEntrega}</span>
          </div>
        </div>

        <p style={{ margin: "0 0 12px 0" }}>
          <strong>Paciente:</strong> {paciente.patientName} (Pasta #{paciente.numeroPasta})
        </p>

        <table className={styles.printTable}>
          <thead>
            <tr>
              <th>Medicamento</th>
              <th className={styles.colCenter}>Qtd. dispensada</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={i}>
                <td>
                  <strong>{item.medicamentoNome}</strong> {item.dosagem}
                </td>
                <td className={styles.colCenter}>
                  <strong>{item.qtdEntregue}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.printAssinaturas}>
          <div className={styles.printAssinatura}>
            <div className={styles.printLinha}></div>
            <strong>{paciente.patientName}</strong>
            <div>Paciente / Receptor</div>
          </div>
        </div>
      </div>
    </div>
  );
}