-- CreateTable: FaqItem
CREATE TABLE "FaqItem" (
    "id"        TEXT NOT NULL,
    "question"  TEXT NOT NULL,
    "answer"    TEXT NOT NULL,
    "category"  TEXT NOT NULL DEFAULT 'Geral',
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "order"     INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FaqItem_category_idx" ON "FaqItem"("category");
CREATE INDEX "FaqItem_isActive_order_idx" ON "FaqItem"("isActive", "order");

-- Seed: initial FAQ items
INSERT INTO "FaqItem" ("id","question","answer","category","isActive","order") VALUES
('faq001','Como funciona o CDI Master Pagamentos?','Seu saldo disponível rende automaticamente pela taxa CDI do seu plano, com juros compostos. O rendimento é calculado mensalmente e creditado sem nenhuma ação necessária da sua parte.','CDI e Rendimentos',true,1),
('faq002','Como aportar saldo no CDI?','Acesse "CDI e Rendimentos" e clique em "Aportar no CDI". Informe o valor do saldo disponível que deseja mover para o CDI e confirme. O valor começa a render imediatamente.','CDI e Rendimentos',true,2),
('faq003','Como fazer um saque?','Acesse "Saques" no menu lateral, informe o valor e a chave Pix de destino. O prazo de liquidação depende do seu plano (Start/Growth: 1 dia útil, Prime: mesmo dia, Black: instantâneo).','Saques',true,1),
('faq004','O que é saldo disponível?','Saldo disponível são valores já compensados e livres para saque ou aporte no CDI. É diferente do saldo em CDI, que está rendendo juros.','Saques',true,2),
('faq005','O que é antecipação de recebíveis?','Permite receber agora os valores de vendas no cartão antes do prazo de liquidação, com desconto de uma taxa conforme seu plano. Disponível exclusivamente para recebíveis de cartão.','Recebíveis',true,1),
('faq006','O que é KYC?','KYC (Know Your Customer) é o processo de verificação de identidade exigido por regulação. Nossa equipe analisa e aprova sua conta em até 2 dias úteis após o envio dos documentos.','Conta',true,1),
('faq007','Como integrar a API do Master Pagamentos?','Acesse "Integrações / API" no menu e copie sua API Key. Use-a no header Authorization das requisições. Consulte a documentação completa na mesma página.','Integrações',true,1),
('faq008','Meu plano pode ser alterado?','Sim. Entre em contato via chamado de suporte para solicitar upgrade. A nova taxa CDI começa a valer no próximo ciclo mensal após a aprovação.','Conta',true,2);
