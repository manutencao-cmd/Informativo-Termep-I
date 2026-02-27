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
        let isMounted = true;
        async function preparePhotos() {
            const photos = data.tempPhotos && data.tempPhotos.length > 0 ? data.tempPhotos : data.fotos || [];
            const processed: string[] = [];

            for (const url of photos) {
                if (!isMounted) return;
                if (url.startsWith('blob:') || url.startsWith('http')) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 10000);

                        const response = await fetch(url, { signal: controller.signal });
                        clearTimeout(timeoutId);

                        const blob = await response.blob();
                        const reader = new FileReader();
                        const base64 = await new Promise<string>((resolve, reject) => {
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        processed.push(base64);
                    } catch (e) {
                        console.error("Erro ao converter imagem:", e);
                        processed.push(url);
                    }
                } else {
                    processed.push(url);
                }
            }
            if (isMounted) setBase64Photos(processed);
        }
        preparePhotos();
        return () => { isMounted = false; };
    }, [data.tempPhotos, data.fotos]);

    const msgWhatsappText = `*Informativo TERMEP*\n${valor !== 'Avaliação' ? `*${valor}*\n` : ''}\n👤 *Cliente:* ${cliente}\n🚜 *Equipamento:* ${veiculo} - ${placa}\n📊 *Status:* ${status}\n🔧 *Serviço:* ${servico}\n\n📅 _Gerado em ${dataStr}_`;

    // Função universal de captura
    const generateImage = async (): Promise<{ blob: Blob, dataUrl: string } | null> => {
        if (!receiptRef.current) return null;

        try {
            // 1. Reset scroll (Essencial para evitar cortes no html2canvas mobile)
            const scrollY = window.scrollY;
            window.scrollTo(0, 0);

            // 2. Garantir que imagens estão carregadas
            const images = Array.from(receiptRef.current.querySelectorAll('img')) as HTMLImageElement[];
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                    setTimeout(resolve, 8000);
                });
            }));

            // 3. Pequeno delay para estabilizar o layout após scroll
            await new Promise(resolve => setTimeout(resolve, 500));

            // 4. Capturar usando html2canvas (Scale 1.0 para estabilidade)
            const canvas = await html2canvas(receiptRef.current, {
                scale: 1,
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                logging: true,
                width: receiptRef.current.scrollWidth,
                height: receiptRef.current.scrollHeight,
                windowWidth: receiptRef.current.scrollWidth,
                windowHeight: receiptRef.current.scrollHeight,
            });

            // 5. Restaurar o scroll do usuário
            window.scrollTo(0, scrollY);

            const dataUrl = canvas.toDataURL('image/png');
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.95));

            if (!blob) throw new Error("Erro ao gerar arquivo final da imagem.");

            return { blob, dataUrl };
        } catch (err: any) {
            console.error("Erro na geração da imagem:", err);
            alert(`Erro na Imagem: ${err.message || 'Falha de Memória'}\n\nTente fechar outras abas do navegador.`);
            return null;
        }
    };

    const handleShare = async () => {
        setIsSharing(true);
        setStatusText('Gerando informativo...');

        try {
            const result = await generateImage();

            if (!result) {
                // generateImage já deu o alert
                return;
            }

            const file = new File([result.blob], 'informativo_termep.png', { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Informativo TERMEP',
                    text: msgWhatsappText
                });
            } else {
                // Fallback para download + whatsapp texto
                handleDownloadAction(result.dataUrl);
                alert("O informativo foi baixado. Por favor, anexe-o manualmente no WhatsApp.");
                fallbackWhatsApp();
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error(err);
                alert("Erro ao compartilhar. Enviando apenas texto.");
                fallbackWhatsApp();
            }
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
            }
        } catch (err) {
            alert("Erro ao realizar download.");
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

            {/* Recibo Visível */}
            <div
                ref={receiptRef}
                style={{ backgroundColor: '#ffffff', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #f3f4f6' }}
            >
                {/* Header */}
                <div style={{ backgroundColor: '#005f73', padding: '40px 24px', textAlign: 'center', color: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '12px', fontWeight: 'normal', letterSpacing: '0.1em', opacity: 0.9, marginBottom: '8px', textTransform: 'uppercase' }}>Informativo TERMEP</h2>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '-0.025em', marginBottom: '8px' }}>{valor !== 'Avaliação' ? valor : 'Serviço'}</div>
                    <div style={{ fontSize: '10px', fontWeight: 'light', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                        {valor !== 'Avaliação' ? 'Status do Serviço' : 'Status do Equipamento'}
                    </div>
                </div>

                {/* Info List */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#005f73', flexShrink: 0, border: '1px solid #f3f4f6' }}>
                            <div style={{ margin: 'auto' }}><User size={18} /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '-0.025em', marginBottom: '2px' }}>Cliente</div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{cliente}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#005f73', flexShrink: 0, border: '1px solid #f3f4f6' }}>
                            <div style={{ margin: 'auto' }}><Car size={18} /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '-0.025em', marginBottom: '2px' }}>Equipamento</div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{veiculo} - {placa}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#005f73', flexShrink: 0, border: '1px solid #f3f4f6' }}>
                            <div style={{ margin: 'auto' }}><Activity size={18} /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '-0.025em', marginBottom: '2px' }}>Status Atual</div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{status}</div>
                        </div>
                        <div style={{ position: 'absolute', top: '4px', right: 0, fontSize: '10px', color: '#d1d5db', fontWeight: '500' }}>
                            {dataStr}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#005f73', flexShrink: 0, border: '1px solid #f3f4f6' }}>
                            <div style={{ margin: 'auto' }}><Wrench size={18} /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '-0.025em', marginBottom: '2px' }}>Serviço Realizado</div>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#4b5563', lineHeight: 1.25 }}>{servico}</div>
                        </div>
                    </div>

                    {/* Photo */}
                    {base64Photos.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            <div style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                                <img
                                    src={base64Photos[0]}
                                    alt="Foto"
                                    style={{ width: '100%', height: 'auto', display: 'block', margin: '0 auto', maxHeight: '600px', objectFit: 'contain' }}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ paddingTop: '16px', textAlign: 'center', borderTop: '1px solid #f9fafb' }}>
                        <p style={{ fontSize: '9px', color: '#d1d5db', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.1em', fontStyle: 'italic' }}>Digitalizado por Termep</p>
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
                            <span>{statusText || 'Gerando...'}</span>
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
                        className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                        {isDownloading ? '...' : 'Baixar Imagem'}
                    </button>
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center gap-2 bg-white text-[#005f73] font-bold py-4 rounded-2xl border-2 border-[#005f73] transition-all active:scale-95"
                    >
                        <ArrowLeft size={18} />
                        Novo
                    </button>
                </div>
            </div>

            <div className="flex gap-2 items-center justify-center p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <AlertCircle className="text-orange-400" size={16} />
                <p className="text-[10px] text-orange-700 font-medium italic text-center">
                    Dica: Se o WhatsApp não abrir com a imagem, clique em "Baixar Imagem" e mande o arquivo manualmente.
                </p>
            </div>

        </div>
    );
}
