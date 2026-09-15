const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const PDFDocument = require("pdfkit");

const app = express();

app.use(express.json());
app.use(cors());

app.use(
  express.static(
    path.join(__dirname, "../frontend")
  )
);


const DB_FILE =
  path.join(__dirname, "db.json");


// =====================================================
// BANCO
// =====================================================

function readDB() {

  if (!fs.existsSync(DB_FILE)) {

    return {

      usuarios: [],

      pacientes: [],

      triagens: [],

      consultas: [],

      altas: [],

      tv_chamada: null,

      tv_historico: []

    };

  }


  const db =
    JSON.parse(
      fs.readFileSync(
        DB_FILE,
        "utf8"
      )
    );


  if (!db.usuarios)
    db.usuarios = [];


  if (!db.pacientes)
    db.pacientes = [];


  if (!db.triagens)
    db.triagens = [];


  if (!db.consultas)
    db.consultas = [];


  /*
    NOVA PARTE:

    Seu db.json antigo não possui "altas".
    O servidor cria automaticamente.
  */

  if (!db.altas)
    db.altas = [];


  if (!("tv_chamada" in db))
    db.tv_chamada = null;


  if (!db.tv_historico)
    db.tv_historico = [];


  return db;

}


function writeDB(data) {

  fs.writeFileSync(

    DB_FILE,

    JSON.stringify(
      data,
      null,
      2
    )

  );

}


// =====================================================
// LOGIN
// =====================================================

app.post("/login", (req, res) => {

  const db =
    readDB();


  const user =
    db.usuarios.find(u =>

      u.usuario ===
      req.body.usuario &&

      u.senha ===
      req.body.senha

    );


  if (!user) {

    return res.status(401).json({

      erro:
        "Login inválido"

    });

  }


  res.json(user);

});


// =====================================================
// ATENDIMENTO
// =====================================================

app.post("/atendimento", (req, res) => {

  const db =
    readDB();


  const paciente = {

    id:
      Date.now(),

    nome:
      req.body.nome || "",

    cpf:
      req.body.cpf || "",

    tipo:
      req.body.tipo ||
      "Particular",

    status:
      "triagem",

    createdAt:
      new Date().toISOString()

  };


  db.pacientes.push(
    paciente
  );


  writeDB(db);


  res.json(
    paciente
  );

});


// =====================================================
// LISTAR PACIENTES
// =====================================================

app.get("/pacientes", (req, res) => {

  const db =
    readDB();

  res.json(
    db.pacientes
  );

});


// =====================================================
// TRIAGEM
// =====================================================

app.post("/triagem", (req, res) => {

  const db =
    readDB();


  let risco =
    req.body.risco;


  const temperatura =
    Number(
      req.body.temperatura
    );


  if (!isNaN(temperatura)) {

    if (temperatura >= 39) {

      risco =
        "vermelho";

    }

    else if (temperatura >= 38) {

      risco =
        "amarelo";

    }

    else if (!risco) {

      risco =
        "verde";

    }

  }


  if (!risco) {

    risco =
      "verde";

  }


  let paciente =
    null;


  if (req.body.pacienteId) {

    paciente =
      db.pacientes.find(p =>

        String(p.id) ===
        String(req.body.pacienteId)

      );

  }


  if (!paciente && req.body.nome) {

    paciente =
      db.pacientes.find(p =>

        p.nome ===
        req.body.nome &&

        p.status ===
        "triagem"

      );

  }


  const triagem = {

    id:
      Date.now(),

    pacienteId:
      paciente
        ? paciente.id
        : null,

    nome:
      req.body.nome || "",

    sintoma:
      req.body.sintoma ||
      req.body.sintomas ||
      "",

    temperatura:
      !isNaN(temperatura)
        ? temperatura
        : "",

    alergia:
      req.body.alergia ||
      "",

    observacao:
      req.body.observacao ||
      "",

    risco:
      risco,

    status:
      "aguardando_medico",

    createdAt:
      new Date().toISOString()

  };


  db.triagens.push(
    triagem
  );


  if (paciente) {

    paciente.status =
      "aguardando_medico";

    paciente.triagemId =
      triagem.id;

  }


  writeDB(db);


  res.json(
    triagem
  );

});


// =====================================================
// TRIAGENS PARA O MÉDICO
// =====================================================

app.get("/triagens", (req, res) => {

  const db =
    readDB();


  const triagens =
    db.triagens

      .filter(t => {

        return (

          !t.status ||

          t.status ===
          "aguardando_medico"

        );

      })

      .map(t => {

        return {

          ...t,

          sintoma:
            t.sintoma ||
            t.sintomas ||
            "",

          temperatura:
            t.temperatura ??
            t.temp ??
            "",

          observacao:
            t.observacao ||
            ""

        };

      });


  res.json(
    triagens
  );

});


// =====================================================
// TV
// =====================================================

app.post("/tv/chamar", (req, res) => {

  const db =
    readDB();


  const chamada = {

    id:
      Date.now().toString(),

    localTipo:
      req.body.localTipo ||
      "CONSULTÓRIO",

    localNumero:
      req.body.localNumero ||
      "01",

    paciente:
      req.body.paciente ||
      "",

    hora:
      new Date().toLocaleTimeString(
        "pt-BR",
        {
          hour:
            "2-digit",

          minute:
            "2-digit"
        }
      )

  };


  db.tv_chamada =
    chamada;


  db.tv_historico.unshift(
    chamada
  );


  if (
    db.tv_historico.length > 5
  ) {

    db.tv_historico.pop();

  }


  writeDB(db);


  res.json(
    chamada
  );

});


app.get("/tv/chamada", (req, res) => {

  const db =
    readDB();


  res.json({

    chamada:
      db.tv_chamada,

    historico:
      db.tv_historico

  });

});


// =====================================================
// MEDICAÇÕES
// =====================================================

app.get(
  "/lista-medicacoes",
  (req, res) => {

    res.json([

      "Dipirona",

      "Paracetamol",

      "Ibuprofeno",

      "Amoxicilina",

      "Azitromicina",

      "Loratadina",

      "Omeprazol",

      "Buscopan",

      "Dramin",

      "Soro fisiológico"

    ]);

  }
);


// =====================================================
// CONSULTA MÉDICA
// =====================================================

app.post("/consulta", (req, res) => {

  const db =
    readDB();


  const {

    paciente,

    pacienteId,

    triagemId,

    diagnostico,

    medicacao,

    obs

  } = req.body;


  if (!paciente) {

    return res.status(400).json({

      erro:
        "Paciente não informado."

    });

  }


  if (!diagnostico) {

    return res.status(400).json({

      erro:
        "Informe o diagnóstico."

    });

  }


  if (!medicacao) {

    return res.status(400).json({

      erro:
        "Selecione uma medicação."

    });

  }


  const consulta = {

    id:
      Date.now(),

    paciente:
      paciente,

    pacienteId:
      pacienteId ||
      null,

    triagemId:
      triagemId ||
      null,

    diagnostico:
      diagnostico,

    medicacao:
      medicacao,

    obs:
      obs ||
      "",

    createdAt:
      new Date().toISOString()

  };


  db.consultas.push(
    consulta
  );


  // ===================================================
  // ATUALIZAR TRIAGEM
  // ===================================================

  let triagem =
    null;


  if (triagemId) {

    triagem =
      db.triagens.find(t =>

        String(t.id) ===
        String(triagemId)

      );

  }


  if (!triagem && pacienteId) {

    triagem =
      db.triagens.find(t =>

        String(t.pacienteId) ===
        String(pacienteId) &&

        t.status ===
        "aguardando_medico"

      );

  }


  if (!triagem) {

    triagem =
      db.triagens.find(t =>

        t.nome ===
        paciente &&

        (
          !t.status ||

          t.status ===
          "aguardando_medico"
        )

      );

  }


  if (triagem) {

    triagem.status =
      "atendido";

    triagem.atendidoEm =
      new Date().toISOString();

  }


  // ===================================================
  // ATUALIZAR PACIENTE
  // ===================================================

  let pacienteBanco =
    null;


  if (pacienteId) {

    pacienteBanco =
      db.pacientes.find(p =>

        String(p.id) ===
        String(pacienteId)

      );

  }


  if (!pacienteBanco) {

    pacienteBanco =
      db.pacientes.find(p =>

        p.nome ===
        paciente

      );

  }


  if (pacienteBanco) {

    pacienteBanco.status =
      "aguardando_alta";

    pacienteBanco.consultaId =
      consulta.id;

  }


  writeDB(db);


  res.json({

    sucesso:
      true,

    consulta:
      consulta

  });

});


// =====================================================
// CONSULTAS
// =====================================================

app.get("/consultas", (req, res) => {

  const db =
    readDB();

  res.json(
    db.consultas
  );

});


// =====================================================
// CONSULTAS QUE AINDA NÃO TIVERAM ALTA
// =====================================================

app.get(
  "/consultas/alta",
  (req, res) => {

    const db =
      readDB();


    const consultasComAlta =
      new Set(

        db.altas.map(alta =>

          String(
            alta.consultaId
          )

        )

      );


    const disponiveis =
      db.consultas.filter(
        consulta =>

          !consultasComAlta.has(
            String(
              consulta.id
            )
          )

      );


    res.json(
      disponiveis
    );

  }
);


// =====================================================
// REGISTRAR ALTA
// =====================================================

app.post("/alta", (req, res) => {

  const db =
    readDB();


  const {

    consultaId,

    paciente,

    pacienteId,

    motivoAlta,

    justificativaAlta

  } = req.body;


  if (!consultaId) {

    return res.status(400).json({

      erro:
        "Consulta não informada."

    });

  }


  if (!paciente) {

    return res.status(400).json({

      erro:
        "Paciente não informado."

    });

  }


  if (!motivoAlta) {

    return res.status(400).json({

      erro:
        "Informe o motivo da alta."

    });

  }


  if (!justificativaAlta) {

    return res.status(400).json({

      erro:
        "Informe a justificativa da alta."

    });

  }


  // ===================================================
  // IMPEDIR DUPLICAÇÃO
  // ===================================================

  const altaExistente =
    db.altas.find(alta =>

      String(alta.consultaId) ===
      String(consultaId)

    );


  if (altaExistente) {

    return res.status(400).json({

      erro:
        "A alta desta consulta já foi registrada."

    });

  }


  // ===================================================
  // ENCONTRAR CONSULTA
  // ===================================================

  const consulta =
    db.consultas.find(c =>

      String(c.id) ===
      String(consultaId)

    );


  if (!consulta) {

    return res.status(404).json({

      erro:
        "Consulta não encontrada."

    });

  }


  // ===================================================
  // CRIAR ALTA
  // ===================================================

  const alta = {

    id:
      Date.now(),

    consultaId:
      consulta.id,

    paciente:
      paciente,

    pacienteId:
      pacienteId ||
      consulta.pacienteId ||
      null,

    diagnostico:
      consulta.diagnostico ||
      "",

    medicacao:
      consulta.medicacao ||
      "",

    obs:
      consulta.obs ||
      "",

    motivoAlta:
      motivoAlta,

    justificativaAlta:
      justificativaAlta,

    createdAt:
      new Date().toISOString()

  };


  db.altas.push(
    alta
  );


  // ===================================================
  // ATUALIZAR PACIENTE
  // ===================================================

  let pacienteBanco =
    null;


  if (alta.pacienteId) {

    pacienteBanco =
      db.pacientes.find(p =>

        String(p.id) ===
        String(alta.pacienteId)

      );

  }


  if (!pacienteBanco) {

    pacienteBanco =
      db.pacientes.find(p =>

        p.nome ===
        paciente

      );

  }


  if (pacienteBanco) {

    pacienteBanco.status =
      "alta";

    pacienteBanco.altaId =
      alta.id;

    pacienteBanco.altaEm =
      alta.createdAt;

  }


  // ===================================================
  // ATUALIZAR CONSULTA
  // ===================================================

  consulta.status =
    "alta_registrada";

  consulta.altaId =
    alta.id;


  writeDB(db);


  res.json({

    sucesso:
      true,

    alta:
      alta

  });

});


// =====================================================
// LISTAR ALTAS
// =====================================================

app.get("/altas", (req, res) => {

  const db =
    readDB();

  res.json(
    db.altas
  );

});


// =====================================================
// BUSCAR ALTA
// =====================================================

app.get(
  "/alta/:id",
  (req, res) => {

    const db =
      readDB();


    const alta =
      db.altas.find(a =>

        String(a.id) ===
        String(req.params.id)

      );


    if (!alta) {

      return res.status(404).json({

        erro:
          "Alta não encontrada."

      });

    }


    res.json(
      alta
    );

  }
);


// =====================================================
// PDF DA ALTA
// =====================================================

app.get(
  "/alta/:id/pdf",
  (req, res) => {

    const db =
      readDB();


    const alta =
      db.altas.find(a =>

        String(a.id) ===
        String(req.params.id)

      );


    if (!alta) {

      return res.status(404).send(

        "Alta não encontrada."

      );

    }


    const doc =
      new PDFDocument({

        size:
          "A4",

        margin:
          50

      });


    const nomeArquivo =
      `alta-${alta.id}.pdf`;


    res.setHeader(
      "Content-Type",
      "application/pdf"
    );


    res.setHeader(

      "Content-Disposition",

      `attachment; filename="${nomeArquivo}"`

    );


    doc.pipe(res);


    // =================================================
    // CABEÇALHO
    // =================================================

    doc

      .fontSize(22)

      .font(
        "Helvetica-Bold"
      )

      .text(

        "HOSPITAL",

        {
          align:
            "center"
        }

      );


    doc.moveDown(0.4);


    doc

      .fontSize(16)

      .font(
        "Helvetica"
      )

      .text(

        "RELATÓRIO DE ALTA HOSPITALAR",

        {
          align:
            "center"
        }

      );


    doc.moveDown(1);


    doc

      .moveTo(
        50,
        doc.y
      )

      .lineTo(
        545,
        doc.y
      )

      .stroke();


    doc.moveDown(1);


    // =================================================
    // PACIENTE
    // =================================================

    doc

      .fontSize(12)

      .font(
        "Helvetica-Bold"
      )

      .text(
        "Paciente"
      );


    doc

      .font(
        "Helvetica"
      )

      .text(

        alta.paciente ||
        "Não informado"

      );


    doc.moveDown(0.8);


    // =================================================
    // DATA
    // =================================================

    doc

      .font(
        "Helvetica-Bold"
      )

      .text(
        "Data e hora da alta"
      );


    doc

      .font(
        "Helvetica"
      )

      .text(

        new Date(
          alta.createdAt
        ).toLocaleString(
          "pt-BR"
        )

      );


    doc.moveDown(1.2);


    // =================================================
    // DIAGNÓSTICO
    // =================================================

    doc

      .fontSize(14)

      .font(
        "Helvetica-Bold"
      )

      .text(
        "Diagnóstico"
      );


    doc.moveDown(0.4);


    doc

      .fontSize(11)

      .font(
        "Helvetica"
      )

      .text(

        alta.diagnostico ||
        "Não informado"

      );


    doc.moveDown(1);


    // =================================================
    // MEDICAÇÃO
    // =================================================

    doc

      .fontSize(14)

      .font(
        "Helvetica-Bold"
      )

      .text(
        "Medicação"
      );


    doc.moveDown(0.4);


    doc

      .fontSize(11)

      .font(
        "Helvetica"
      )

      .text(

        alta.medicacao ||
        "Não informada"

      );


    doc.moveDown(1);


    // =================================================
    // OBSERVAÇÕES
    // =================================================

    doc

      .fontSize(14)

      .font(
        "Helvetica-Bold"
      )

      .text(
        "Observações"
      );


    doc.moveDown(0.4);


    doc

      .fontSize(11)

      .font(
        "Helvetica"
      )

      .text(

        alta.obs ||
        "Nenhuma observação."

      );


    doc.moveDown(1);


    // =================================================
    // MOTIVO DA ALTA
    // =================================================

    doc

      .fontSize(14)

      .font(
        "Helvetica-Bold"
      )

      .text(

        "Motivo da Alta / Saída"

      );


    doc.moveDown(0.4);


    doc

      .fontSize(11)

      .font(
        "Helvetica"
      )

      .text(

        alta.motivoAlta ||
        "Não informado"

      );


    doc.moveDown(1);


    // =================================================
    // JUSTIFICATIVA
    // =================================================

    doc

      .fontSize(14)

      .font(
        "Helvetica-Bold"
      )

      .text(

        "Justificativa da Alta / Saída"

      );


    doc.moveDown(0.4);


    doc

      .fontSize(11)

      .font(
        "Helvetica"
      )

      .text(

        alta.justificativaAlta ||
        "Não informada"

      );


    doc.moveDown(2);


    // =================================================
    // IDENTIFICAÇÃO
    // =================================================

    doc

      .moveTo(
        50,
        doc.y
      )

      .lineTo(
        545,
        doc.y
      )

      .stroke();


    doc.moveDown(0.7);


    doc

      .fontSize(9)

      .font(
        "Helvetica"
      )

      .text(

        "Documento gerado pelo sistema hospitalar.",

        {
          align:
            "center"
        }

      );


    doc.text(

      "Registro eletrônico de alta.",

      {
        align:
          "center"
      }

    );


    doc.end();

  }
);


// =====================================================
// MEDICAÇÕES ANTIGA
// =====================================================

app.get(
  "/medicacoes",
  (req, res) => {

    const db =
      readDB();

    res.json(
      db.consultas
    );

  }
);


// =====================================================
// SERVIDOR
// =====================================================

const PORT =
  process.env.PORT ||
  3000;


app.listen(
  PORT,
  () => {

    console.log(
      `Servidor rodando na porta ${PORT}`
    );

  }
);
