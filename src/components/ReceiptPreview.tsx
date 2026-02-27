import React, { useRef, useState, useEffect } from 'react';
import { User, Car, Activity, Wrench, Share2, ArrowLeft, Loader2, Camera, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReceiptPreviewProps {
    data: any;
    onBack: () => void;
}

export function ReceiptPreview({ data, onBack }: ReceiptPreviewProps) {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isCapturing, setIsCapturing] = useState(true);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
    const [base64Photos, setBase64Photos] = useState<string[]>([]);

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

    // 1. Converter fotos para Base64 (Evita bugs com Blob no html2canvas)
    useEffect(() => {
        async function preparePhotos() {
            const photos = data.tempPhotos && data.tempPhotos.length > 0 ? data.tempPhotos : data.fotos || [];
            const processed: string[] = [];

            for (const url of photos) {
                if (url.startsWith('blob:')) {
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
                        console.error("Erro ao converter blob para base64:", e);
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

    // 2. Captura automática quando as fotos base64 estiverem prontas
    useEffect(() => {
        if (base64Photos.length >= 0 && isCapturing && !capturedImage) {
            // Pequeno delay para garantir renderização do DOM
            const timer = setTimeout(async () => {
                if (receiptRef.current) {
                    try {
                        const canvas = await html2canvas(receiptRef.current, {
                            scale: 2,
                            useCORS: true,
                            allowTaint: true,
                            backgroundColor: "#ffffff",
                            logging: false,
                        });

                        const dataUrl = canvas.toDataURL('image/png');
                        setCapturedImage(dataUrl);

                        canvas.toBlob((blob) => {
                            setCapturedBlob(blob);
                            setIsCapturing(false);
                        }, 'image/png', 0.95);
                    } catch (err) {
                        console.error("Erro na captura automática:", err);
                        setIsCapturing(false);
                    }
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [base64Photos, isCapturing, capturedImage]);

    // Message context for text fallback
    const msgWhatsapp = `*Informativo TERMEP*\n${valor !== 'Avaliação' ? `*${valor}*\n` : ''}\n👤 *Cliente:* ${cliente}\n🚜 *Equipamento:* ${veiculo} - ${placa}\n📊 *Status:* ${status}\n🔧 *Serviço:* ${servico}\n\n📅 _Gerado em ${dataStr}_`;

    const handleShare = async () => {
        if (!capturedBlob || !capturedImage) {
            alert("Aguarde o processamento da imagem...");
            return;
        }

        setIsSharing(true);
        const file = new File([capturedBlob], 'informativo_termep.png', { type: 'image/png' });

        try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Informativo TERMEP',
                    text: msgWhatsapp
                });
            } else {
                throw new Error("Share not supported");
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                handleDownload();
                fallbackWhatsApp();
            }
        } finally {
            setIsSharing(false);
        }
    };

    const handleDownload = () => {
        if (!capturedImage) return;
        const link = document.createElement('a');
        link.href = capturedImage;
        link.download = `TERMEP_${cliente.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fallbackWhatsApp = () => {
        const cleanPhone = telefone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const urlWhatsapp = `https://wa.me/${finalPhone}?text=${encodeURIComponent(msgWhatsapp)}`;
        window.open(urlWhatsapp, '_blank');
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20 px-4">

            {/* Stage 1: Invisible Capture Target */}
            <div className="fixed -left-[9999px] top-0 overflow-hidden">
                <div
                    ref={receiptRef}
                    id="receipt-capture"
                    className="bg-white w-[375px] overflow-hidden flex flex-col"
                >
                    <div className="bg-[#005f73] px-6 py-10 text-center text-white flex flex-col items-center">
                        <h2 className="text-sm font-normal tracking-wide opacity-90 mb-2 uppercase">Informativo TERMEP</h2>
                        <div className="text-4xl font-bold tracking-tight mb-2">{valor !== 'Avaliação' ? valor : 'Status do Serviço'}</div>
                        <div className="text-xs font-light opacity-80 uppercase tracking-widest">
                            {valor !== 'Avaliação' ? 'Status do Serviço' : ''}
                        </div>
                    </div>

                    <div className="p-6 space-y-6 bg-white">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                                <User size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold text-gray-800 uppercase leading-none mb-1">Cliente</div>
                                <div className="text-sm text-gray-600 font-medium">{cliente}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                                <Car size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold text-gray-800 uppercase leading-none mb-1">Equipamento</div>
                                <div className="text-sm text-gray-600 font-medium">{veiculo} - {placa}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 relative">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                                <Activity size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold text-gray-800 uppercase leading-none mb-1">Status Atual</div>
                                <div className="text-sm text-gray-600 font-medium">{status}</div>
                            </div>
                            <div className="absolute top-0 right-0 text-[10px] text-gray-400 font-medium">
                                {dataStr}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                                <Wrench size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold text-gray-800 uppercase leading-none mb-1">Serviço Realizado</div>
                                <div className="text-sm text-gray-600 leading-snug font-medium">{servico}</div>
                            </div>
                        </div>

                        {base64Photos.length > 0 && (
                            <div className="mt-4">
                                <div className="w-full rounded-2xl overflow-hidden border border-gray-100">
                                    <img
                                        src={base64Photos[0]}
                                        alt="Foto"
                                        className="w-full h-auto object-contain block mx-auto"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pt-4 text-center">
                            <p className="text-[8px] text-gray-300 uppercase tracking-tighter">Comprovante Digital TERMEP</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stage 2: User Preview */}
            <div className="text-center">
                <h3 className="text-lg font-bold text-[#005f73] mb-1">Seu Informativo Digital</h3>
                <p className="text-xs text-gray-500">Confira abaixo o arquivo que será enviado</p>
            </div>

            <div className="relative group">
                {isCapturing ? (
                    <div className="w-full aspect-[3/4] bg-white rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                        <Loader2 className="animate-spin text-[#005f73] mb-3" size={40} />
                        <p className="text-sm font-medium text-gray-500 animate-pulse">Gerando imagem...</p>
                    </div>
                ) : capturedImage ? (
                    <div className="shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
                        <img src={capturedImage} alt="Preview do Recibo" className="w-full h-auto block" />
                    </div>
                ) : (
                    <div className="w-full p-8 text-center bg-red-50 text-red-600 rounded-3xl">
                        Erro ao gerar visualização. Tente novamente.
                    </div>
                )}
            </div>

            {/* Actions */}
            {!isCapturing && (
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-70"
                    >
                        {isSharing ? <Loader2 className="animate-spin" size={22} /> : <Share2 size={22} />}
                        Compartilhar no WhatsApp
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleDownload}
                            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
                        >
                            <Download size={18} />
                            Baixar Imagem
                        </button>
                        <button
                            onClick={onBack}
                            className="flex items-center justify-center gap-2 bg-white text-[#005f73] font-bold py-3 rounded-xl border-2 border-[#005f73] transition-all active:scale-95"
                        >
                            <ArrowLeft size={18} />
                            Novo
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
