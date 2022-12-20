const { query } = require('express');
const express = require('express');
const oracledb = require('oracledb');

// Crie um arquivo de configuração para armazenar as informações de conexão
// com o banco de dados Oracle, como o endereço do servidor, o nome do banco de dados,
// o usuário e a senha
const dbConfig = {
  user: 'user',
  password: 'pass',
  connectString: 'link'
};

// Crie uma função que se conecta ao banco de dados Oracle e executa uma consulta
async function getData(req, res) {
  let connection;

  try {
    // Conecte-se ao banco de dados
    connection = await oracledb.getConnection(dbConfig);
    query = `SELECT 
    O.NR_ATENDIMENTO ATENDIMENTO,
    TASY.OBTER_DADOS_PF(O.CD_PESSOA_FISICA, 'I') DS_IDADE,
    O.CD_PESSOA_FISICA as CD_PESSOA_FISICA,
    O.CD_UNIDADE LEITO,
    S.CD_SETOR_ATENDIMENTO,
    S.DS_SETOR_ATENDIMENTO SETOR,
    O.NM_PESSOA_FISICA NOME,
    TASY.OBTER_DATA_NASCTO_PF(O.CD_PESSOA_FISICA) NASCIMENTO,
    E.DT_ATUALIZACAO ATUALIZACAO_NEWS,
    E.QT_PONTUACAO NEWS,
    E.QT_FREQ_RESP FR,
    E.QT_TEMP TEMP,
    E.QT_PA_SISTOLICA PAS,
    E.QT_FREQ_CARDIACA FC,
    E.IE_NIVEL_CONSCIENCIA NIVEL_CONSC
    FROM TASY.OCUPACAO_UNIDADE_V O INNER JOIN TASY.SETOR_ATENDIMENTO S ON (O.CD_SETOR_ATENDIMENTO = S.CD_SETOR_ATENDIMENTO)
                          LEFT JOIN TASY.ESCALA_MEWS E ON (O.NR_ATENDIMENTO = E.NR_ATENDIMENTO)
                          LEFT JOIN (SELECT MAX(Z.DT_ALERTA) DT_ALERTA, Z.NR_SEQUENCIA, Z.CD_PESSOA_FISICA
                                        FROM TASY.ALERTA_PACIENTE Z
                                        WHERE Z.NR_SEQ_TIPO_ALERTA = 12
                                        AND Z.DT_FIM_ALERTA IS NULL
                                        AND Z.DT_INATIVACAO IS NULL
                                        AND Z.DT_LIBERACAO IS NOT NULL
                                        GROUP BY Z.CD_PESSOA_FISICA, Z.NR_SEQUENCIA) A ON (A.CD_PESSOA_FISICA = O.CD_PESSOA_FISICA)
                         LEFT JOIN (SELECT PA.CD_PESSOA_FISICA, PA.DT_ATUALIZACAO, PA.IE_NEGA_ALERGIAS
                                    FROM TASY.PACIENTE_ALERGIA PA INNER JOIN (SELECT CD_PESSOA_FISICA, MAX(DT_ATUALIZACAO) DT_ATUALIZACAO FROM TASY.PACIENTE_ALERGIA GROUP BY CD_PESSOA_FISICA) AA ON (PA.CD_PESSOA_FISICA = AA.CD_PESSOA_FISICA)
                                    AND PA.DT_ATUALIZACAO = AA.DT_ATUALIZACAO) ALERGIAS ON (ALERGIAS.CD_PESSOA_FISICA = O.CD_PESSOA_FISICA
                                                                                            AND S.IE_ADEP = 'S'
                                                                                            AND S.CD_ESTABELECIMENTO_BASE = 2
                                                                                            AND S.IE_SITUACAO = 'A'
                                                                                            AND E.DT_INATIVACAO IS NULL
                                                                                            AND E.DT_LIBERACAO IS NOT NULL
                                                                                            AND E.DT_ATUALIZACAO = (SELECT MAX(B.DT_ATUALIZACAO)
                                                                                                                    FROM TASY.ESCALA_NEWS B
                                                                                                                    WHERE B.NR_ATENDIMENTO = O.NR_ATENDIMENTO)
                                                                                            AND TO_DATE(E.DT_ATUALIZACAO) > (SYSDATE-1))

    WHERE O.DS_TIPO_ACOMODACAO NOT LIKE 'Setor sem acomodação'
    AND O.NR_ATENDIMENTO IS NOT NULL
    AND (S.CD_SETOR_ATENDIMENTO = :CD_SETOR_ATENDIMENTO)
    AND E.DT_ATUALIZACAO = (SELECT MAX(X.DT_ATUALIZACAO) FROM TASY.ESCALA_MEWS X WHERE X.NR_ATENDIMENTO = O.NR_ATENDIMENTO)
ORDER BY 4, 3`
    // Execute a consulta SQL
    const result = await connection.execute(query);

    // Obtenha os dados retornados pelo select
    const data = result.rows;

    // Crie uma resposta HTTP usando o módulo express
    res.send({ data });
  } catch (err) {
    // Trate possíveis erros
    console.error(err);
    res.send({ error: 'Erro ao se conectar ao banco de dados' });
  } finally {
    // Não se esqueça de fechar a conexão no final da função
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

// Crie uma instância do express
const app = express();

// Crie uma rota para a função de conexão e consulta
app.get('/data', getData);

// Inicie o servidor da API
app.listen(4545, () => {
  console.log('API iniciada na porta 4545');
});
