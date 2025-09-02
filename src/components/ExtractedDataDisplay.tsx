import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Code, FileText, Eye, Puzzle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExtractedData {
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: {
    rua: string;
    complemento: string;
    bairro: string;
    cep: string;
    cidade: string;
    estado: string;
    pais: string;
  };
}

interface ExtractedDataDisplayProps {
  data: ExtractedData | null;
  rawText: string;
}

export const ExtractedDataDisplay: React.FC<ExtractedDataDisplayProps> = ({ data, rawText }) => {
  const [copied, setCopied] = useState(false);
  const [copiedPopup, setCopiedPopup] = useState(false);
  const { toast } = useToast();

  const generateJavaScriptCode = (data: ExtractedData): string => {
    return `var empresa = {
  nome: "${data.nome}",
  cnpj: "${data.cnpj}",
  telefone: "${data.telefone}",
  email: "${data.email}",
  logo_url: "../images/logo.png",
  endereco: {
    rua: "${data.endereco.rua}",
    complemento: "${data.endereco.complemento}",
    bairro: "${data.endereco.bairro}",
    cep: "${data.endereco.cep}",
    cidade: "${data.endereco.cidade}",
    estado: "${data.endereco.estado}",
    pais: "${data.endereco.pais}",
  },
  bancosParceiros: [
    "Banco Santander (Brasil) S.A., CNPJ 90.400.888/0001-42",
    "Caixa Econômica Federal, CNPJ 00.360.305/0001-04",
    "Banco Itaú Unibanco, CNPJ 60.701.190/0001-04",
    "Banco do Brasil, CNPJ 00.000.000/0001-91",
    "Banco Bradesco, CNPJ 60.746.948/0001-12",
  ],
};`;
  };

  const generatePopupExtensionCode = (data: ExtractedData): string => {
    const fullAddress = `${data.endereco.rua}, ${data.endereco.cidade} - ${data.endereco.estado}, ${data.endereco.cep}, ${data.endereco.pais}`;
    
    return `// ===== Util =====
const $ = (id) => document.getElementById(id);
const q = (sel, root = document) => root.querySelector(sel);

function normalizeUrl(u) {
  if (!u) return "";
  try {
    let x = u.trim();
    if (!/^https?:\\/\\//.test(x)) x = "https://" + x;
    return new URL(x).toString();
  } catch {
    return u;
  }
}

// ===== Tabs =====
const tabs = { fill: $("tabFill"), links: $("tabLinks") };
const sections = { fill: $("section-fill"), links: $("section-links") };
function setTab(which) {
  const a = which === "links" ? "links" : "fill";
  tabs.fill.setAttribute("aria-selected", a === "fill");
  tabs.links.setAttribute("aria-selected", a === "links");
  sections.fill.classList.toggle("active", a === "fill");
  sections.links.classList.toggle("active", a === "links");
}
tabs.fill.addEventListener("click", () => setTab("fill"));
tabs.links.addEventListener("click", () => setTab("links"));

// ===== Restore main fields =====
async function restoreMain() {
  const { companyName, cnpj, phone, address, email, site, googleAdsId } =
    await chrome.storage.local.get([
      "companyName",
      "cnpj",
      "phone",
      "address",
      "email",
      "site",
      "googleAdsId",
    ]);
  // DADOS EXTRAÍDOS AUTOMATICAMENTE:
  if (companyName || "${data.nome}") $("companyName").value = companyName || "${data.nome}";
  if (cnpj || "${data.cnpj}") $("cnpj").value = cnpj || "${data.cnpj}";
  if (phone || "${data.telefone}") $("phone").value = phone || "${data.telefone}";
  if (address || "${fullAddress}") $("address").value = address || "${fullAddress}";
  if (email || "${data.email}") $("email").value = email || "${data.email}";
  if (site) $("site").value = site;
  // se o campo de ID existir no popup e já houver algo salvo, mostra (é opcional)
  if (googleAdsId && $("adsId")) $("adsId").value = googleAdsId;
}
restoreMain();

// ===== Google Ads ID (mostrar/copy) =====
async function initAdsIdUI() {
  try {
    // 1) Mostra SEMPRE a caixinha no popup
    $("adsIdBox").style.display = "block";

    // 2) Preenche com o que já estiver salvo (se tiver)
    const { googleAdsId } = await chrome.storage.local.get(["googleAdsId"]);
    if (googleAdsId) {
      $("adsId").value = googleAdsId;
      $("adsIdCopy").disabled = false;
    } else {
      $("adsIdCopy").disabled = true; // fica desabilitado até ter ID
    }

    // 3) Tenta capturar/atualizar automaticamente quando a aba for ads.google.com
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url && /https?:\\/\\/ads\\.google\\.com/i.test(tab.url)) {
      const [inj] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () =>
          new Promise((resolve) => {
            const pat = /(\\d{3}-\\d{3}-\\d{4})/;
            const pick = (txt) => (txt || "").match(pat)?.[1] || null;

            function tryFind() {
              const el = document.querySelector(
                'div.account-info[title], div.account-info, [title*="-"]'
              );
              let raw = el
                ? pick(el?.getAttribute?.("title")) || pick(el?.textContent)
                : null;
              if (!raw) {
                const nodes = document.querySelectorAll(
                  "[title],[aria-label],div,span"
                );
                for (const n of nodes) {
                  raw =
                    pick(n.getAttribute?.("title")) ||
                    pick(n.getAttribute?.("aria-label")) ||
                    pick(n.textContent);
                  if (raw) break;
                }
              }
              return raw;
            }

            const t0 = Date.now();
            (function tick() {
              const raw = tryFind();
              if (raw) return resolve(raw.replace(/-/g, "")); // sem traços
              if (Date.now() - t0 > 4000) return resolve(null);
              requestAnimationFrame(tick);
            })();
          }),
      });

      const id = inj?.result;
      if (id) {
        $("adsId").value = id;
        $("adsIdCopy").disabled = false;
        await chrome.storage.local.set({ googleAdsId: id }); // salva
      }
    }

    // 4) Botão copiar (funciona sempre que houver valor)
    $("adsIdCopy").onclick = async () => {
      const v = $("adsId").value.trim();
      if (!v) return;
      try {
        await navigator.clipboard.writeText(v);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = v;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      const btn = $("adsIdCopy");
      const old = btn.textContent;
      btn.textContent = "Copiado!";
      setTimeout(() => (btn.textContent = old), 1200);
    };
  } catch (e) {
    console.debug("AdsIdUI err:", e);
  }
}

initAdsIdUI();

// ===== Fill button =====
$("fillBtn").addEventListener("click", async () => {
  // pega o ID salvo (sem depender de estar no ads.google.com agora)
  const { googleAdsId: storedId } = await chrome.storage.local.get([
    "googleAdsId",
  ]);
  const googleAdsId = (storedId || "").replace(/\\D/g, "");

  const data = {
    companyName: $("companyName").value.trim(),
    cnpj: $("cnpj").value.trim(),
    phone: $("phone").value.trim(),
    address: $("address").value.trim(),
    email: $("email").value.trim(),
    site: $("site").value.trim(),
    googleAdsId, // <<< passamos pro script injetado
  };
  await chrome.storage.local.set(data);
  $("status").textContent = "Injetando...";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (data) => {
        const waitFor = (sel, timeout = 10000) =>
          new Promise((resolve, reject) => {
            const t0 = Date.now();
            (function tick() {
              const el = document.querySelector(sel);
              if (el) return resolve(el);
              if (Date.now() - t0 > timeout)
                return reject(new Error("not found: " + sel));
              requestAnimationFrame(tick);
            })();
          });

        const ensureVisible = (el) => {
          if (!el) return;
          const box = el.closest(".option_text");
          if (box) box.classList.remove("d-none");
          let p = el.parentElement;
          while (p) {
            p.hidden = false;
            p = p.parentElement;
          }
        };

        const setValue = (selector, value) => {
          const el = document.querySelector(selector);
          if (!el) return false;
          ensureVisible(el);
          if (el.type === "checkbox" || el.type === "radio") {
            el.checked = !!value;
          } else {
            el.value = value;
          }
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
          return true;
        };

        // --- Google Ads Customer ID (se vier do popup), por ID e por NAME ---
        if (data.googleAdsId) {
          setValue(
            "#application_applicant_attributes_google_customer_id",
            data.googleAdsId
          );

          const byName = document.querySelector(
            'input[name="application[applicant_attributes][google_customer_id]"]'
          );
          if (byName) {
            ensureVisible(byName);
            byName.value = data.googleAdsId;
            byName.dispatchEvent(new Event("input", { bubbles: true }));
            byName.dispatchEvent(new Event("change", { bubbles: true }));
            byName.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
          }
        }

        const TEMPLATES = {
          brief: \`A \${data.companyName} oferece serviços de intermediação imobiliária e orientação para clientes interessados em simular financiamentos habitacionais junto a instituições financeiras regulamentadas, como Banco Santander, Caixa Econômica Federal, Itaú e Bradesco.
Atuamos como facilitadores, promovendo complementos secundários de serviços financeiros, sem oferecer crédito diretamente. Nossos anúncios direcionam usuários que buscam soluções financeiras para imóveis, garantindo transparência e conformidade com as regras do Google.\`,
          docs: \`Envio o certificado do CNPJ da \${data.companyName} (CNPJ:\${data.cnpj}), que comprova a existência legal da empresa e sua atividade principal como imobiliária. A \${data.companyName} não presta serviços financeiros diretamente, mas pode promover complementos financeiros regulamentados por terceiros autorizados\`,
          relationship: \`Sou representante autorizado da \${data.companyName}, empresa para a qual estou realizando esta solicitação de verificação.
A conexão pode ser verificada através do site oficial da empresa [\${data.site}], bem como por documentos oficiais como o certificado do CNPJ (\${data.cnpj}).
Caso necessário, posso fornecer comunicados internos e outros registros comerciais que comprovem a autorização para agir em nome da empresa.\`,
        };

        const reveal = document.querySelector(
          "#application_submission_non_financials_attributes_4_add_me"
        );
        if (reveal) {
          reveal.checked = true;
          reveal.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const MAP = {
          "#application_submission_user_facing_business_name": data.companyName,
          "#application_submission_business_name": data.companyName,
          "#application_submission_business_address": data.address,
          "#application_submission_business_phone_number_input": data.phone,
          "#application_submission_company_registrations_attributes_0_registration_number":
            data.cnpj,
          "#application_submission_advertising_domains_": data.site,
          "#application_applicant_attributes_email_address": data.email,
          "#application_submission_non_financials_attributes_4_first_party_fsp_url":
            data.site,
          "#application_submission_brief_business_description": TEMPLATES.brief,
          "#application_submission_documentation_desc": TEMPLATES.docs,
        };

        for (const [sel, val] of Object.entries(MAP)) {
          if (sel === "#application_submission_advertising_domains_") {
            const all = document.querySelectorAll(sel);
            if (all.length) {
              all.forEach((el, i) => {
                if (i === 0 || !el.value) {
                  el.value = val;
                  el.dispatchEvent(new Event("input", { bubbles: true }));
                  el.dispatchEvent(new Event("change", { bubbles: true }));
                }
              });
              continue;
            }
          }
          setValue(sel, val);
        }

        const APPLICANT_REL_SELECT_ID =
          "application_submission_applicant_relationship";
        const APPLICANT_REL_VALUE = "parent_company";
        const nativeRel = document.getElementById(APPLICANT_REL_SELECT_ID);
        if (nativeRel) {
          nativeRel.value = APPLICANT_REL_VALUE;
          nativeRel.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          const relContainer = document.getElementById(
            "select2-" + APPLICANT_REL_SELECT_ID + "-container"
          );
          if (relContainer) {
            const sel = relContainer
              .closest(".select2")
              .querySelector(".select2-selection");
            if (sel) sel.click();
            waitFor(\`li[id$="-\${APPLICANT_REL_VALUE}"]\`, 5000)
              .then((li) => li.click())
              .catch(() => {});
          }
        }

        waitFor(
          "#application_submission_applicant_relationship_description",
          6000
        )
          .then(() =>
            setValue(
              "#application_submission_applicant_relationship_description",
              TEMPLATES.relationship
            )
          )
          .catch(() => {});

        const COUNTRY_SELECT_ID = "application_submission_incorporated_country";
        const COUNTRY_VALUE = "BR";
        const nativeCountry = document.getElementById(COUNTRY_SELECT_ID);
        if (nativeCountry) {
          nativeCountry.value = COUNTRY_VALUE;
          nativeCountry.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          const countryContainer = document.getElementById(
            "select2-" + COUNTRY_SELECT_ID + "-container"
          );
          if (countryContainer) {
            const sel = countryContainer
              .closest(".select2")
              .querySelector(".select2-selection");
            if (sel) sel.click();
            waitFor(\`li[id$="-\${COUNTRY_VALUE}"]\`, 5000)
              .then((li) => li.click())
              .catch(() => {});
          }
        }

        [
          "#application_submission_non_financial_attestation_acknowledgement",
          "#application_submission_warranty_acknowledgement",
          "#application_submission_terms_acknowledgement",
          "#application_submission_privacy_acknowledgement",
          "#application_submission_personal_data_privacy_policy_acknowledgement",
        ].forEach((sel) => {
          const el = document.querySelector(sel);
          if (el) {
            el.checked = true;
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });

        setValue(
          "#application_submission_non_financials_attributes_4_first_party_fsp_name",
          "Banco Santander S.A."
        );
        setValue(
          "#application_submission_non_financials_attributes_4_first_party_fsp_registry_name",
          "Banco Central do Brasil (BACEN)"
        );
        setValue(
          "#application_submission_non_financials_attributes_4_first_party_fsp_registry_number",
          "9040088-8"
        );

        const toast = document.createElement("div");
        toast.textContent = "AutoFill concluído.";
        Object.assign(toast.style, {
          position: "fixed",
          left: "20px",
          bottom: "20px",
          padding: "10px 14px",
          background: "#1351b4",
          color: "#fff",
          borderRadius: "10px",
          zIndex: 999999,
          boxShadow: "0 8px 24px rgba(0,0,0,.2)",
          fontFamily: "system-ui, sans-serif",
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      },
      args: [data],
    });
    $("status").textContent = "Pronto!";
  } catch (e) {
    $("status").textContent = "Erro: " + e.message;
  }
});

// ===== Links Manager =====
const DEFAULT_LINKS = [
  {
    label: "Google Ads",
    url: "https://ads.google.com/intl/pt-br_br/start/lc/?subid=br-pt-ha-awa-bk-c-scru!o3~CjwKCAjwiNXFBhBKEiwAPSaPCWl5Af8SLWL8V_SqJKTb84KEYFld9DiX6Wp76iNseC383uGVMAwKXxoCy5EQAvD_BwE~172680095245~kwd-18076681375~22183922852~731247305950&gclsrc=aw.ds&gad_source=1&gad_campaignid=22183922852&gclid=CjwKCAjwiNXFBhBKEiwAPSaPCWl5Af8SLWL8V_SqJKTb84KEYFld9DiX6Wp76iNseC383uGVMAwKXxoCy5EQAvD_BwE",
  },
  {
    label: "G2 Verificação",
    url: "https://greenlight.g2netview.com/applications/new?country=BR&locale=pt-BR",
  },
];

async function loadLinks() {
  let { quickLinks, quickLinksInit } = await chrome.storage.local.get([
    "quickLinks",
    "quickLinksInit",
  ]);
  if (!quickLinksInit) {
    quickLinks = DEFAULT_LINKS;
    await chrome.storage.local.set({ quickLinks, quickLinksInit: true });
  }
  return quickLinks || [];
}

async function saveLinks(arr) {
  await chrome.storage.local.set({ quickLinks: arr });
}

function renderLinks(list) {
  const el = $("linksList");
  el.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Nenhum link cadastrado ainda.";
    el.appendChild(empty);
    return;
  }
  list.forEach((lk, idx) => {
    const row = document.createElement("div");
    row.className = "link-row";
    const col = document.createElement("div");
    col.className = "row-two";
    const label = document.createElement("div");
    label.className = "link-label";
    label.textContent = lk.label || "(sem nome)";
    const url = document.createElement("div");
    url.className = "link-url";
    url.textContent = lk.url;
    col.appendChild(label);
    col.appendChild(url);

    const open = document.createElement("button");
    open.className = "btn-sm btn-open";
    open.textContent = "Abrir";
    open.addEventListener("click", async () => {
      await chrome.tabs.create({ url: lk.url });
    });

    const edit = document.createElement("button");
    edit.className = "btn-sm";
    edit.textContent = "Editar";
    edit.addEventListener("click", () => startEdit(row, list, idx));

    const del = document.createElement("button");
    del.className = "btn-sm btn-danger";
    del.textContent = "Excluir";
    del.addEventListener("click", async () => {
      const arr = (await loadLinks()).filter((_, i) => i !== idx);
      await saveLinks(arr);
      renderLinks(arr);
    });

    row.appendChild(col);
    row.appendChild(open);
    row.appendChild(edit);
    row.appendChild(del);
    el.appendChild(row);
  });
}

function startEdit(row, list, idx) {
  row.innerHTML = "";
  const item = list[idx];
  const nameI = document.createElement("input");
  nameI.value = item.label;
  nameI.placeholder = "Nome";
  const urlI = document.createElement("input");
  urlI.value = item.url;
  urlI.placeholder = "https://...";
  const saveB = document.createElement("button");
  saveB.className = "btn-sm";
  saveB.textContent = "Salvar";
  const cancelB = document.createElement("button");
  cancelB.className = "btn-sm btn-danger";
  cancelB.textContent = "Cancelar";
  row.className = "link-row";
  row.style.gridTemplateColumns = "1fr 1fr auto auto";
  row.appendChild(nameI);
  row.appendChild(urlI);
  row.appendChild(saveB);
  row.appendChild(cancelB);

  saveB.addEventListener("click", async () => {
    const arr = await loadLinks();
    arr[idx] = {
      label: nameI.value.trim() || "(sem nome)",
      url: normalizeUrl(urlI.value),
    };
    await saveLinks(arr);
    renderLinks(arr);
  });
  cancelB.addEventListener("click", async () => renderLinks(await loadLinks()));
}

// Add link
$("addLinkBtn").addEventListener("click", async () => {
  const label = $("linkLabel").value.trim() || "(sem nome)";
  const url = normalizeUrl($("linkUrl").value.trim());
  if (!url) {
    $("linkUrl").focus();
    return;
  }
  const arr = await loadLinks();
  arr.push({ label, url });
  await saveLinks(arr);
  $("linkLabel").value = "";
  $("linkUrl").value = "";
  renderLinks(arr);
});

// Initial render
loadLinks().then(renderLinks);`;
  };

  const jsCode = data ? generateJavaScriptCode(data) : '';
  const popupCode = data ? generatePopupExtensionCode(data) : '';

  const handleCopyCode = async () => {
    if (!data) return;
    
    try {
      await navigator.clipboard.writeText(jsCode);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "O código JavaScript foi copiado para a área de transferência.",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleCopyPopupCode = async () => {
    if (!data) return;
    
    try {
      await navigator.clipboard.writeText(popupCode);
      setCopiedPopup(true);
      toast({
        title: "Código da extensão copiado!",
        description: "O código para extensão popup foi copiado para a área de transferência.",
      });
      
      setTimeout(() => setCopiedPopup(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="bg-card/30 backdrop-blur-sm max-w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Code className="w-5 h-5 text-primary" />
          Dados Extraídos
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <Tabs defaultValue={data ? "code" : "raw"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 p-1">
            <TabsTrigger value="code" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4" disabled={!data}>
              <Code className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Código</span>
              <span className="xs:hidden">JS</span>
            </TabsTrigger>
            <TabsTrigger value="popup" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4" disabled={!data}>
              <Puzzle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Popup</span>
              <span className="xs:hidden">Ext</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4" disabled={!data}>
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Preview</span>
              <span className="xs:hidden">Ver</span>
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Original</span>
              <span className="xs:hidden">Txt</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="space-y-4">
            {data ? (
              <>
                <div className="relative">
                  <pre className="bg-muted/20 p-2 sm:p-4 rounded-lg text-xs sm:text-sm overflow-x-auto border max-w-full">
                    <code className="block whitespace-pre-wrap break-words sm:whitespace-pre">{jsCode}</code>
                  </pre>
                  
                  <Button
                    onClick={handleCopyCode}
                    className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-gradient-primary hover:scale-105 transition-all duration-200 h-8 w-auto sm:h-9 px-2 sm:px-3"
                    size="sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm hidden xs:inline">Copiar</span>
                        <span className="text-xs xs:hidden">Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ✨ Código JavaScript pronto para uso com todos os dados extraídos do arquivo.
                </p>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Não foi possível extrair os dados do arquivo</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="popup" className="space-y-4">
            {data ? (
              <>
                <div className="relative">
                  <pre className="bg-muted/20 p-2 sm:p-4 rounded-lg text-xs sm:text-sm overflow-x-auto border max-w-full">
                    <code className="block whitespace-pre-wrap break-words sm:whitespace-pre">{popupCode}</code>
                  </pre>
                  
                  <Button
                    onClick={handleCopyPopupCode}
                    className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-gradient-primary hover:scale-105 transition-all duration-200 h-8 w-auto sm:h-9 px-2 sm:px-3"
                    size="sm"
                  >
                    {copiedPopup ? (
                      <>
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm hidden xs:inline">Copiar</span>
                        <span className="text-xs xs:hidden">Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-xs sm:text-sm text-muted-foreground">
                  🔌 Código JavaScript específico para preencher os campos da extensão popup automaticamente.
                </p>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Puzzle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Não foi possível extrair os dados do arquivo</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {data ? (
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold text-primary text-sm sm:text-base">Dados da Empresa</h3>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium break-words">{data.nome}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0">
                      <span className="text-muted-foreground">CNPJ:</span>
                      <span className="font-mono break-words">{data.cnpj}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span className="break-words">{data.telefone}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0">
                      <span className="text-muted-foreground">E-mail:</span>
                      <span className="break-all">{data.email}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-primary text-sm sm:text-base">Endereço</h3>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0">
                      <span className="text-muted-foreground">Rua:</span>
                      <span className="font-medium break-words text-right">{data.endereco.rua}</span>
                    </div>
                    {data.endereco.complemento && (
                      <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0">
                        <span className="text-muted-foreground">Complemento:</span>
                        <span className="break-words">{data.endereco.complemento}</span>
                      </div>
                    )}
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0">
                      <span className="text-muted-foreground">Bairro:</span>
                      <span className="break-words">{data.endereco.bairro}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0">
                      <span className="text-muted-foreground">CEP:</span>
                      <span className="font-mono break-words">{data.endereco.cep}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0">
                      <span className="text-muted-foreground">Cidade:</span>
                      <span className="break-words">{data.endereco.cidade}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-0">
                      <span className="text-muted-foreground">Estado:</span>
                      <span className="break-words">{data.endereco.estado}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Não foi possível extrair os dados do arquivo</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
            <Textarea
              value={rawText}
              readOnly
              className="min-h-[150px] sm:min-h-[200px] bg-muted/20 font-mono text-xs resize-none"
              placeholder="Texto original extraído do arquivo aparecerá aqui..."
            />
            <p className="text-xs sm:text-sm text-muted-foreground">
              📄 Texto completo extraído do arquivo para referência e debugging.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};