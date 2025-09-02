import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { ExtractedDataDisplay } from './ExtractedDataDisplay';
import { Loader2, Zap, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker (use local bundler URL to avoid CORS/fake-worker)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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

interface DataExtractorProps {
  userEmail: string;
  onLogout: () => void;
}

export const DataExtractor: React.FC<DataExtractorProps> = ({ userEmail, onLogout }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const { toast } = useToast();

  const extractDataFromText = (text: string): ExtractedData => {
    // Normaliza quebras de linha e remove espaços duplos para facilitar a busca
    const normalized = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n /g, '\n');

    /**
     * Função auxiliar para extrair dados.
     * Procura por um rótulo (com variações de espaço) e captura o valor na linha seguinte.
     * @param labelRegex - Uma expressão regular para encontrar o rótulo. Ex: /NOME\s+EMPRESARIAL/i
     * @returns O valor encontrado ou null.
     */
    const findValueAfterLabel = (labelRegex: RegExp): string | null => {
      const match = normalized.match(new RegExp(labelRegex.source + '\\s*\\n\\s*([^\\n]+)', 'i'));
      return match ? match[1].trim() : null;
    };

    // Usando as funções de busca aprimoradas
    const nome = findValueAfterLabel(/NOME\s+EMPRESARIAL/);
    const cnpj = findValueAfterLabel(/NUMERO\s+DE\s+INSCRIÇÃO/);
    const telefone = findValueAfterLabel(/TELEFONE/);
    const email = findValueAfterLabel(/ENDEREÇO\s+ELETRONICO/);
    const logradouro = findValueAfterLabel(/LOGRADOURO/);
    const numero = findValueAfterLabel(/NUMERO/);
    const complemento = findValueAfterLabel(/COMPLEMENTO/);
    const bairro = findValueAfterLabel(/BAIRRO\/DISTRITO|BAIRRO/);
    const cep = findValueAfterLabel(/CEP/);
    const cidade = findValueAfterLabel(/MUNICIPIO/);
    const estado = findValueAfterLabel(/UF/);

    const rua = [logradouro, numero].filter(Boolean).join(' ').trim();

    return {
      nome: nome || 'NÃO ENCONTRADO',
      cnpj: cnpj || 'NÃO ENCONTRADO',
      telefone: telefone || 'NÃO ENCONTRADO',
      email: email || 'NÃO ENCONTRADO',
      endereco: {
        rua: rua || 'Rua não encontrada',
        complemento: complemento || '',
        bairro: bairro || 'NÃO ENCONTRADO',
        cep: cep || 'NÃO ENCONTRADO',
        cidade: cidade || 'NÃO ENCONTRADO',
        estado: estado || 'UF',
        pais: 'Brasil',
      },
    };
  };

  const processPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => {
          const s = item.str || '';
          // Adiciona espaço ou nova linha baseado no hasEOL para manter a estrutura
          const eol = item.hasEOL === true ? '\n' : ' ';
          return s + eol;
        })
        .join('')
        .replace(/[ \t]+\n/g, '\n') // Limpa espaços antes de novas linhas
        .replace(/\n{2,}/g, '\n'); // Limpa múltiplas novas linhas
      fullText += pageText + '\n';
    }

    return fullText;
  };

  const processTextFile = async (file: File): Promise<string> => {
    return await file.text();
  };

  const handleFileProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setExtractedData(null);
    setRawText('');

    try {
      let text = '';

      if (selectedFile.type === 'application/pdf') {
        text = await processPDF(selectedFile);
      } else {
        text = await processTextFile(selectedFile);
      }

      setRawText(text);
      const data = extractDataFromText(text);
      setExtractedData(data);

      toast({
        title: "Processamento concluído!",
        description: "Dados extraídos com sucesso do arquivo.",
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar o arquivo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-lg">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Extrator de Dados PDF</h1>
            <p className="text-sm text-muted-foreground">Logado como: {userEmail}</p>
          </div>
        </div>
        
        <Button variant="outline" onClick={onLogout} className="hover:bg-destructive/10">
          Sair
        </Button>
      </div>

      <div className="grid gap-6 max-w-4xl mx-auto">
        {/* Upload Section */}
        <Card className="bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Carregar Arquivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
              onClearFile={() => {
                setSelectedFile(null);
                setExtractedData(null);
                setRawText('');
              }}
              isProcessing={isProcessing}
            />
            
            {selectedFile && (
              <Button
                onClick={handleFileProcess}
                disabled={isProcessing}
                className="w-full bg-gradient-primary hover:scale-[1.01] transition-all duration-300"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando arquivo...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Processar Arquivo
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {extractedData && (
          <ExtractedDataDisplay
            data={extractedData}
            rawText={rawText}
          />
        )}
      </div>
    </div>
  );
};