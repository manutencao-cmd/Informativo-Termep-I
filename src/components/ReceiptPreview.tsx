import React, { useRef, useState, useEffect } from 'react';
import { User, Car, Activity, Wrench, Share2, ArrowLeft, Loader2, Download, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReceiptPreviewProps {
    data: any;
    onBack: () => void;
}

export function ReceiptPreview({ data, onBack }: ReceiptPreviewProps) {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [base64Photos, setBase64Photos] = useState<string[]>([]);
    const [statusText, setStatusText] = useState('');

    // Pre-process variables
    const cliente = data.cliente || '';
    const telefone = data.telefone || '';
    const veiculo = data.veiculo || '';
    const placa = data.placa || '';
    const status = data.status || '';
    const servico = data.servico || '';
    const valor = data.valor !== '0.00' ? `R$ ${data.valor.replace('.', ',')}` : 'Avaliação';

    // Format date
    let dataStr = '';
    if (data.data && typeof data.data.toLocaleDateString === 'function') {
        dataStr = data.data.toLocaleDateString('pt-BR');
    } else {
        const today = new Date();
        dataStr = today.toLocaleDateString('pt-BR');
    }

    // 1. Converter fotos para Base64 (Crucial para html2canvas no mobile)
    useEffect(() => {
        async function preparePhotos() {
            const photos = data.tempPhotos && data.tempPhotos.length > 0 ? data.tempPhotos : data.fotos || [];
            const processed: string[] = [];

            for (const url of photos) {
                if (url.startsWith('blob:') || url.startsWith('http')) {
                    try {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        const reader = new FileReader();
                        const base64 = await new Promise<string>((resolve) => {
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                        processed.push(base64);
                    } catch (e) {
                        console.error("Erro ao converter imagem para base64:", e);
                        processed.push(url);
                    }
                } else {
                    processed.push(url);
                }
            }
            setBase64Photos(processed);
        }
        preparePhotos();
    }, [data.tempPhotos, data.fotos]);

    const msgWhatsappText = `*Informativo TERMEP*\n${valor !== 'Avaliação' ? `*${valor}*\n` : ''}\n👤 *Cliente:* ${cliente}\n🚜 *Equipamento:* ${veiculo} - ${placa}\n📊 *Status:* ${status}\n🔧 *Serviço:* ${servico}\n\n📅 _Gerado em ${dataStr}_`;

    // Função universal de captura
    const generateImage = async (): Promise<{ blob: Blob, dataUrl: string } | null> => {
        if (!receiptRef.current) return null;

        try {
            // Garantir que imagens estão carregadas
            const images = Array.from(receiptRef.current.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
            }));

            // Pequeno delay para estabilizar o layout
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(receiptRef.current, {
                scale: 1.5, // Reduzido para economizar memória no mobile
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                logging: false,
                width: receiptRef.current.offsetWidth,
                height: receiptRef.current.offsetHeight,
            });

            const dataUrl = canvas.toDataURL('image/png');
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9));

            if (!blob) return null;
            return { blob, dataUrl };
        } catch (err) {
            console.error("Erro na geração da imagem:", err);
            return null;
        }
    };

    const handleShare = async () => {
        setIsSharing(true);
        setStatusText('Gerando informativo...');

        try {
            const result = await generateImage();

            if (!result) {
                throw new Error("Não foi possível gerar a imagem.");
            }

            const file = new File([result.blob], 'informativo_termep.png', { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Informativo TERMEP',
                    text: msgWhatsappText
                });
            } else {
                // Se não suportar arquivos no Share API
                handleDownloadAction(result.dataUrl);
                alert("Seu celular não permite o envio automático da imagem. O informativo foi baixado para sua galeria. Por favor, anexe-o manualmente no WhatsApp.");
                fallbackWhatsApp();
            }
        } catch (err: any) {
            console.error(err);
            alert("Erro ao gerar imagem. Enviando apenas as informações em texto.");
            fallbackWhatsApp();
        } finally {
            setIsSharing(false);
            setStatusText('');
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        setStatusText('Baixando...');
        try {
            const result = await generateImage();
            if (result) {
                handleDownloadAction(result.dataUrl);
            } else {
                alert("Erro ao gerar imagem para download.");
            }
        } catch (err) {
            alert("Erro ao baixar arquivo.");
        } finally {
            setIsDownloading(false);
            setStatusText('');
        }
    };

    const handleDownloadAction = (dataUrl: string) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `TERMEP_${cliente.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fallbackWhatsApp = () => {
        const cleanPhone = telefone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const urlWhatsapp = `https://wa.me/${finalPhone}?text=${encodeURIComponent(msgWhatsappText)}`;
        window.open(urlWhatsapp, '_blank');
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20 px-4">

            {/* Recibo Visível (O que o usuário vê é o que será capturado) */}
            <div
                ref={receiptRef}
                className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 flex flex-col"
            >
                {/* Header */}
                <div className="bg-[#005f73] px-6 py-10 text-center text-white flex flex-col items-center">
                    <h2 className="text-xs font-normal tracking-widest opacity-90 mb-2 uppercase">Informativo TERMEP</h2>
                    <div className="text-4xl font-bold tracking-tight mb-2">{valor !== 'Avaliação' ? valor : 'Serviço'}</div>
                    <div className="text-[10px] font-light opacity-70 uppercase tracking-[0.2em]">
                        {valor !== 'Avaliação' ? 'Status do Serviço' : 'Status do Equipamento'}
                    </div>
                </div>

                {/* Info List */}
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[#005f73] shrink-0 border border-gray-100">
                            <User size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Cliente</div>
                            <div className="text-sm font-semibold text-gray-700">{cliente}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[#005f73] shrink-0 border border-gray-100">
                            <Car size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Equipamento</div>
                            <div className="text-sm font-semibold text-gray-700">{veiculo} - {placa}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[#005f73] shrink-0 border border-gray-100">
                            <Activity size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Status Atual</div>
                            <div className="text-sm font-semibold text-gray-700">{status}</div>
                        </div>
                        <div className="absolute top-1 right-0 text-[9px] text-gray-300 font-medium">
                            {dataStr}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[#005f73] shrink-0 border border-gray-100">
                            <Wrench size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Serviço Realizado</div>
                            <div className="text-sm font-medium text-gray-600 leading-snug">{servico}</div>
                        </div>
                    </div>

                    {/* Photo */}
                    {base64Photos.length > 0 && (
                        <div className="mt-4">
                            <div className="w-full rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                                <img
                                    src={base64Photos[0]}
                                    alt="Foto do Serviço"
                                    className="w-full h-auto object-contain block mx-auto"
                                    style={{ maxHeight: '500px' }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-4 text-center border-t border-gray-50">
                        <p className="text-[9px] text-gray-300 font-medium uppercase tracking-widest italic">Digitalizado por Termep</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
                <button
                    onClick={handleShare}
                    disabled={isSharing || isDownloading}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-75"
                >
                    {isSharing ? (
                        <>
                            <Loader2 className="animate-spin" size={22} />
                            <span>{statusText || 'Compartilhando...'}</span>
                        </>
                    ) : (
                        <>
                            <Share2 size={22} />
                            <span>Compartilhar no WhatsApp</span>
                        </>
                    )}
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleDownload}
                        disabled={isSharing || isDownloading}
                        className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                        {isDownloading ? 'Gerando...' : 'Baixar Imagem'}
                    </button>
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center gap-2 bg-white text-[#005f73] font-bold py-3.5 rounded-2xl border-2 border-[#005f73] transition-all active:scale-95"
                    >
                        <ArrowLeft size={18} />
                        Novo Serviço
                    </button>
                </div>
            </div>

            {/* Tip */}
            <div className="flex gap-2 items-center justify-center p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <AlertCircle className="text-blue-400" size={16} />
                <p className="text-[10px] text-blue-600 font-medium italic">
                    Dica: Se o automático falhar, clique em "Baixar Imagem" e anexe no WhatsApp.
                </p>
            </div>

        </div>
    );
}
