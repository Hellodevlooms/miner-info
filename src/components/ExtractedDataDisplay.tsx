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
    
    return `// Código para preencher os campos da extensão popup
document.getElementById('companyName').value = "${data.nome}";
document.getElementById('cnpj').value = "${data.cnpj}";
document.getElementById('phone').value = "${data.telefone}";
document.getElementById('address').value = "${fullAddress}";
document.getElementById('email').value = "${data.email}";
document.getElementById('site').value = ""; // Preencher manualmente se necessário

// Salvar os dados no localStorage para persistência
localStorage.setItem('companyData', JSON.stringify({
  companyName: "${data.nome}",
  cnpj: "${data.cnpj}",
  phone: "${data.telefone}",
  address: "${fullAddress}",
  email: "${data.email}",
  site: ""
}));

console.log("Dados preenchidos com sucesso!");`;
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
    <Card className="bg-card/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5 text-primary" />
          Dados Extraídos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={data ? "code" : "raw"} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="code" className="flex items-center gap-2" disabled={!data}>
              <Code className="w-4 h-4" />
              Código JS
            </TabsTrigger>
            <TabsTrigger value="popup" className="flex items-center gap-2" disabled={!data}>
              <Puzzle className="w-4 h-4" />
              Extensão Popup
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!data}>
              <Eye className="w-4 h-4" />
              Visualização
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Texto Original
            </TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="space-y-4">
            {data ? (
              <>
                <div className="relative">
                  <pre className="bg-muted/20 p-4 rounded-lg text-sm overflow-x-auto border">
                    <code>{jsCode}</code>
                  </pre>
                  
                  <Button
                    onClick={handleCopyCode}
                    className="absolute top-2 right-2 bg-gradient-primary hover:scale-105 transition-all duration-200"
                    size="sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Código
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
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
                  <pre className="bg-muted/20 p-4 rounded-lg text-sm overflow-x-auto border">
                    <code>{popupCode}</code>
                  </pre>
                  
                  <Button
                    onClick={handleCopyPopupCode}
                    className="absolute top-2 right-2 bg-gradient-primary hover:scale-105 transition-all duration-200"
                    size="sm"
                  >
                    {copiedPopup ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Código
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold text-primary">Dados da Empresa</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium">{data.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CNPJ:</span>
                      <span className="font-mono">{data.cnpj}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span>{data.telefone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E-mail:</span>
                      <span className="break-all">{data.email}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-primary">Endereço</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rua:</span>
                      <span className="font-medium text-right">{data.endereco.rua}</span>
                    </div>
                    {data.endereco.complemento && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Complemento:</span>
                        <span>{data.endereco.complemento}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bairro:</span>
                      <span>{data.endereco.bairro}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CEP:</span>
                      <span className="font-mono">{data.endereco.cep}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cidade:</span>
                      <span>{data.endereco.cidade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      <span>{data.endereco.estado}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Não foi possível extrair os dados do arquivo</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
            <Textarea
              value={rawText}
              readOnly
              className="min-h-[200px] bg-muted/20 font-mono text-xs"
              placeholder="Texto original extraído do arquivo aparecerá aqui..."
            />
            <p className="text-sm text-muted-foreground">
              📄 Texto completo extraído do arquivo para referência e debugging.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};