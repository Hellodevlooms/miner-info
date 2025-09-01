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
    // Normaliza quebras de linha para regex mais preciso
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Escapa rótulos com caracteres especiais (/, (), etc.)
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Extrai o valor que aparece na linha seguinte ao rótulo ou na mesma linha após ':'
    const extractLineAfter = (label: string) => {
      const l = esc(label);
      const patterns = [
        new RegExp(`${l}\\s*[\\r\\n]+\\s*([^\\r\\n]+)`, 'i'), // rótulo em uma linha e valor na próxima
        new RegExp(`${l}\\s*[:\\-]?\\s*([^\\r\\n]+)`, 'i'),      // rótulo e valor na mesma linha
      ];
      for (const p of patterns) {
        const m = normalized.match(p);
        if (m) return m[1].trim();
      }
      return null;
    };

    const nome = extractLineAfter('NOME EMPRESARIAL')
      || normalized.match(/(?:nome empresarial|razao social|empresa)[:\s]*([^\n\r]+)/i)?.[1]?.trim()
      || 'NÃO ENCONTRADO';

    const cnpj = extractLineAfter('NUMERO DE INSCRIÇÃO')
      || normalized.match(/(?:cnpj|cadastro)[:\s]*([0-9]{2}\.?[0-9]{3}\.?[0-9]{3}\/[0-9]{4}-?[0-9]{2})/i)?.[1]?.trim()
      || 'NÃO ENCONTRADO';

    const telefone = extractLineAfter('TELEFONE')
      || normalized.match(/(?:telefone|fone|tel)[:\s]*(\(?[0-9]{2}\)?[.\s-]?[0-9]{4,5}[.\s-]?[0-9]{4})/i)?.[1]?.trim()
      || 'NÃO ENCONTRADO';

    const email = extractLineAfter('ENDEREÇO ELETRONICO')
      || normalized.match(/(?:email|e-mail|endereco eletronico)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1]?.trim()
      || 'NÃO ENCONTRADO';

    const logradouro = extractLineAfter('LOGRADOURO') || '';
    const numero = extractLineAfter('NUMERO') || '';
    const complemento = extractLineAfter('COMPLEMENTO') || '';
    const bairro = extractLineAfter('BAIRRO/DISTRITO') || extractLineAfter('BAIRRO') || 'NÃO ENCONTRADO';
    const cep = extractLineAfter('CEP') || 'NÃO ENCONTRADO';
    const cidade = extractLineAfter('MUNICIPIO') || 'NÃO ENCONTRADO';
    const estado = extractLineAfter('UF') || 'NÃO ENCONTRADO';

    const rua = [logradouro, numero].filter(Boolean).join(' ').trim() || 'Rua não encontrada';

    return {
      nome: nome || 'Nome não encontrado',
      cnpj: cnpj || 'CNPJ não encontrado',
      telefone: telefone || 'Telefone não encontrado',
      email: email || 'Email não encontrado',
      endereco: {
        rua,
        complemento: complemento || '',
        bairro: bairro || 'Bairro não encontrado',
        cep: cep || 'CEP não encontrado',
        cidade: cidade || 'Cidade não encontrada',
        estado: (estado && estado !== 'NÃO ENCONTRADO') ? estado : 'UF',
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
          const eol = item.hasEOL === true ? '\n' : ' ';
          return s + eol;
        })
        .join('')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{2,}/g, '\n');
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