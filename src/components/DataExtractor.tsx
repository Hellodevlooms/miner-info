import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { ExtractedDataDisplay } from './ExtractedDataDisplay';
import { Loader2, Zap, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
    // Regex patterns for data extraction
    const patterns = {
      nome: /(?:nome empresarial|razao social|empresa)[:\s]*([^\n\r]+)/i,
      cnpj: /(?:cnpj|cadastro)[:\s]*([0-9]{2}\.?[0-9]{3}\.?[0-9]{3}\/[0-9]{4}-?[0-9]{2})/i,
      telefone: /(?:telefone|fone|tel)[:\s]*(\(?[0-9]{2}\)?[.\s-]?[0-9]{4,5}[.\s-]?[0-9]{4})/i,
      email: /(?:email|e-mail|endereco eletronico)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      rua: /(?:logradouro|endereco|rua)[:\s]*([^\n\r,]+?)(?:[,\n\r]|numero)/i,
      numero: /(?:numero|n[°º]?)[:\s]*([0-9A-Za-z\s]+)/i,
      complemento: /(?:complemento|compl)[:\s]*([^\n\r]+)/i,
      bairro: /(?:bairro|distrito)[:\s]*([^\n\r]+)/i,
      cep: /(?:cep)[:\s]*([0-9]{5}[.-]?[0-9]{3})/i,
      cidade: /(?:cidade|municipio)[:\s]*([^\n\r]+)/i,
      estado: /(?:estado|uf)[:\s]*([A-Z]{2})/i,
    };

    const extracted: Partial<ExtractedData> = {};

    // Extract basic data
    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        if (key === 'rua' || key === 'numero' || key === 'complemento' || key === 'bairro' || key === 'cep' || key === 'cidade' || key === 'estado') {
          if (!extracted.endereco) extracted.endereco = {} as any;
          (extracted.endereco as any)[key] = value;
        } else {
          (extracted as any)[key] = value;
        }
      }
    });

    // Combine rua and numero
    if (extracted.endereco?.rua) {
      const numeroMatch = text.match(patterns.numero);
      if (numeroMatch) {
        extracted.endereco.rua = `${extracted.endereco.rua} ${numeroMatch[1].trim()}`;
      }
    }

    // Set default values for missing fields
    return {
      nome: extracted.nome || "Nome não encontrado",
      cnpj: extracted.cnpj || "CNPJ não encontrado",
      telefone: extracted.telefone || "Telefone não encontrado",
      email: extracted.email || "Email não encontrado",
      endereco: {
        rua: extracted.endereco?.rua || "Rua não encontrada",
        complemento: extracted.endereco?.complemento || "",
        bairro: extracted.endereco?.bairro || "Bairro não encontrado",
        cep: extracted.endereco?.cep || "CEP não encontrado",
        cidade: extracted.endereco?.cidade || "Cidade não encontrada",
        estado: extracted.endereco?.estado || "UF",
        pais: "Brasil"
      }
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
        .map((item: any) => item.str)
        .join(' ');
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