import React, { useRef, useState } from 'react';
import { User, Car, Activity, Wrench, Share2, ArrowLeft, Loader2, Camera, ClipboardList } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReceiptPreviewProps {
    data: any;
    onBack: () => void;
}

export function ReceiptPreview({ data, onBack }: ReceiptPreviewProps) {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);

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

    // Pre-process Whatsapp message (Fallback Text)
    let msgWhatsapp = `*Informativo TERMEP*\n`;
    if (data.valor !== '0.00' && data.valor !== 'Avaliação') msgWhatsapp += `*${valor}*\n`;
    msgWhatsapp += `\n👤 *Cliente:* ${cliente}\n`;
    msgWhatsapp += `🚜 *Equipamento:* ${veiculo} - ${placa}\n`;
    msgWhatsapp += `📊 *Status:* ${status}\n`;
    msgWhatsapp += `🔧 *Serviço:* ${servico}\n`;
    msgWhatsapp += `\n📅 _Gerado em ${dataStr}_`;

    const handleShare = async () => {
        if (!receiptRef.current) return;
        setIsSharing(true);

        try {
            console.log("Iniciando captura do recibo...");
            // 1. Garantir que as imagens dentro do recibo estão totalmente carregadas
            const images = Array.from(receiptRef.current.querySelectorAll('img')) as HTMLImageElement[];
            const promises = images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve; // Continua mesmo se uma imagem falhar
                });
            });
            await Promise.all(promises);

            // 2. Pequeno delay extra para garantir renderização estável
            await new Promise(resolve => setTimeout(resolve, 800));

            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                logging: true,
                // Forçar dimensões para evitar cortes
                width: receiptRef.current.offsetWidth,
                height: receiptRef.current.offsetHeight,
                scrollX: 0,
                scrollY: -window.scrollY,
                onclone: (doc) => {
                    const clone = doc.getElementById('receipt-capture');
                    if (clone) {
                        clone.style.display = 'block';
                    }
                }
            });

            console.log("Canvas gerado com sucesso.");

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
            if (!blob) throw new Error("Falha ao gerar o arquivo de imagem.");

            const file = new File([blob], 'informativo_termep.png', { type: 'image/png' });

            // 3. Tentar compartilhar o arquivo (Ideal para Mobile)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Informativo TERMEP',
                        text: msgWhatsapp
                    });
                    setIsSharing(false);
                    return; // Sucesso!
                } catch (shareErr: any) {
                    if (shareErr.name === 'AbortError') {
                        setIsSharing(false);
                        return; // Usuário cancelou, não faz fallback
                    }
                    console.warn("Share API falhou, tentando fallback...", shareErr);
                }
            }

            // 4. Fallback: Se não conseguir compartilhar o arquivo diretamente
            // Baixa a imagem para o celular e abre o WhatsApp com o texto
            const imageUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `TERMEP_${cliente.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert("Sua imagem foi baixada automaticamente! Agora, basta anexá-la na conversa do WhatsApp que irá abrir.");
            fallbackWhatsApp();

        } catch (error: any) {
            console.error("Erro crítico no compartilhamento:", error);
            alert("Não foi possível gerar a imagem. Enviando apenas as informações em texto...");
            fallbackWhatsApp();
        } finally {
            setIsSharing(false);
        }
    };

    const fallbackWhatsApp = () => {
        const cleanPhone = telefone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const urlWhatsapp = `https://wa.me/${finalPhone}?text=${encodeURIComponent(msgWhatsapp)}`;
        window.open(urlWhatsapp, '_blank');
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20">

            {/* Target for html2canvas */}
            <div
                ref={receiptRef}
                id="receipt-capture"
                className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 flex flex-col"
            >
                {/* Header Section (Novo Design) */}
                <div className="bg-[#005f73] px-6 py-10 text-center text-white flex flex-col items-center">
                    <h2 className="text-sm font-normal tracking-wide opacity-90 mb-2">Informativo TERMEP</h2>
                    <div className="text-4xl font-bold tracking-tight mb-4">{valor !== 'Avaliação' ? valor : 'Status do Serviço'}</div>
                    <div className="text-sm font-light opacity-80 uppercase tracking-widest">
                        {valor !== 'Avaliação' ? 'Status do Serviço' : ''}
                    </div>
                </div>

                {/* Info List Section */}
                <div className="p-6 space-y-6 bg-white">

                    {/* Item: Cliente */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                            <User size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-gray-800 uppercase">Cliente</div>
                            <div className="text-sm text-gray-600">{cliente}</div>
                        </div>
                    </div>

                    {/* Item: Equipamento */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                            <Car size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-gray-800 uppercase">Equipamento</div>
                            <div className="text-sm text-gray-600">{veiculo} - {placa}</div>
                        </div>
                    </div>

                    {/* Item: Status */}
                    <div className="flex items-center gap-4 relative">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                            <Activity size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-gray-800 uppercase">Status Atual</div>
                            <div className="text-sm text-gray-600">{status}</div>
                        </div>
                        <div className="absolute top-0 right-0 text-[10px] text-gray-400 font-medium">
                            {dataStr}
                        </div>
                    </div>

                    {/* Item: Serviço */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                            <Wrench size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-gray-800 uppercase">Serviço Realizado</div>
                            <div className="text-sm text-gray-600 leading-snug">{servico}</div>
                        </div>
                    </div>

                    {/* Large Photo Section */}
                    {((data.tempPhotos && data.tempPhotos.length > 0) || (data.fotos && data.fotos.length > 0)) && (
                        <div className="mt-4 pt-2">
                            <div className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50">
                                {(data.tempPhotos && data.tempPhotos.length > 0 ? data.tempPhotos : data.fotos).slice(0, 1).map((url: string, index: number) => (
                                    <img
                                        key={index}
                                        src={url}
                                        alt="Foto do Serviço"
                                        className="w-full h-auto object-contain block mx-auto"
                                        style={{ maxHeight: '600px' }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions (Not Captured) */}
            <div className="flex flex-col gap-3 px-4">
                <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70"
                >
                    {isSharing ? <Loader2 className="animate-spin" size={22} /> : <Share2 size={22} />}
                    Compartilhar no WhatsApp
                </button>

                <button
                    onClick={onBack}
                    className="w-full flex items-center justify-center gap-2 bg-white text-[#005f73] font-bold py-4 rounded-xl border-2 border-[#005f73] transition-all active:scale-95"
                >
                    <ArrowLeft size={22} />
                    Novo Serviço
                </button>
            </div>

        </div>
    );
}
