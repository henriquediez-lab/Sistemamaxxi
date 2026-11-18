-- A migração anterior adicionou a coluna "role" com valor padrão 'atendente'
-- pra todas as contas já existentes — inclusive a conta original do dono,
-- criada antes desse recurso existir, que ficou incorretamente marcada como
-- atendente em vez de admin. Promove a conta mais antiga pra admin, mas só
-- se ainda não existir nenhum admin (não mexe em sistemas que já têm um).
UPDATE "User" SET role = 'admin'
WHERE id = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE role = 'admin');
