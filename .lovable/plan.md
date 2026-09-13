# Publicação segura da versão atual

## Objetivo
Publicar a versão mais recente da `main` sem incluir o commit local indesejado e com o merge atômico do Oura funcionando em produção.

## Etapas
1. Descartar o estado local indesejado e sincronizar o projeto com a `main`.
2. Aplicar a migração pendente `20260912150000_oura_upsert_merge_rpc.sql`.
3. Republicar as funções Oura afetadas para usar o merge atômico.
4. Verificar o resultado da atualização e os bloqueios críticos de segurança.
5. Publicar o frontend atualizado em `move-progress-log.lovable.app`.
6. Confirmar a versão publicada e executar uma verificação rápida dos fluxos essenciais.

## Resultado esperado
A versão pública ficará alinhada à `main`, sem a regressão local do timer e com a proteção contra sobrescrita de métricas Oura ativa.
