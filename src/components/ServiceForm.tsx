import React, { useState } from 'react';
import { collection, addDoc, ref, uploadBytes, getDownloadURL, db, storage } from '../lib/firebase';
import { cn } from '../lib/cn';

interface ServiceFormProps {
    onSuccess: (data: any) => void;
}

export function ServiceForm({ onSuccess }: ServiceFormProps) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [errorPhone, setErrorPhone] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        // Validate and format phone
        const rawPhone = (data.telefone as string).replace(/\D/g, '');
        if (!/^[0-9]{10,11}$/.test(rawPhone)) {
            setErrorPhone(true);
            return;
        }
        setErrorPhone(false);

        setLoading(true);
        setStatus('Validando dados...');

        try {
            const valorInput = data.valor as string;
            const valor = valorInput ? parseFloat(valorInput).toFixed(2) : '0.00';
            const hoje = new Date();

            let anexos: { url: string, type: string, name: string }[] = [];
            let tempAnexos: { url: string, type: string, name: string }[] = [];

            if (files.length > 0) {
                setStatus(`Processando ${files.length} arquivo(s)...`);
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const localUrl = URL.createObjectURL(file);
                    const fileType = file.type.split('/')[0] === 'image' ? 'image' :
                        file.type.split('/')[0] === 'video' ? 'video' : 'pdf';

                    const anexoItem = { url: localUrl, type: fileType, name: file.name };
                    tempAnexos.push(anexoItem);

                    if (storage) {
                        try {
                            setStatus(`Enviando ${fileType} ${i + 1} de ${files.length}...`);
                            const fileName = `oficina/${Date.now()}_${file.name}`;
                            const storageRef = ref(storage, fileName);

                            const uploadPromise = uploadBytes(storageRef, file);
                            const timeoutPromise = new Promise((_, reject) =>
                                setTimeout(() => reject(new Error("Timeout no upload")), 15000)
                            );

                            const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
                            const url = await getDownloadURL(snapshot.ref);
                            anexos.push({ url, type: fileType, name: file.name });
                        } catch (storageErr) {
                            console.warn("Falha no upload para o Storage:", storageErr);
                        }
                    }
                }
            }

            setStatus('Salvando informações...');

            // Removemos o campo 'fotos' original (que contém os arquivos brutos) 
            // antes de enviar para o Firestore, pois ele não aceita objetos File.
            const { fotos: _, ...dataSemArquivosBrutos } = data;

            const serviceData = {
                ...dataSemArquivosBrutos,
                telefone: rawPhone,
                valor,
                arquivos: anexos,
                tempAnexos,
                data: hoje,
            };

            if (db) {
                // Timeout para o banco de dados
                const dbPromise = addDoc(collection(db, "servicos"), serviceData);
                const dbTimeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Erro de conexão com banco")), 10000)
                );
                await Promise.race([dbPromise, dbTimeout]);
            }

            setStatus('Concluído!');
            // Passamos os arquivos File originais para o preview poder compartilhá-los diretamente
            onSuccess({ ...serviceData, data: new Date(), originalFiles: files });
        } catch (err: any) {
            console.error("Erro no formulário:", err);
            alert(`Erro: ${err.message || 'Falha ao salvar'}. Verifique sua conexão.`);
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto py-6 px-4 bg-white shadow-sm sm:rounded-lg border border-gray-100">
            <div className="mb-6 relative">
                <h1 className="text-2xl font-bold text-[#005f73] text-center pb-2">
                    Status do Serviço
                </h1>
                <div className="h-0.5 bg-[#005f73] w-full" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="cliente" className="label-text">Cliente *</label>
                    <input type="text" id="cliente" name="cliente" required className="input-field" />
                </div>

                <div>
                    <label htmlFor="telefone" className="label-text">Telefone (com DDD, sem +55) *</label>
                    <input type="tel" id="telefone" name="telefone" required className={cn("input-field", errorPhone && "border-red-500")} placeholder="Ex: 11999999999" />
                    {errorPhone && <p className="text-red-500 text-sm mt-1">Digite apenas números (10 ou 11 dígitos).</p>}
                </div>

                <div>
                    <label htmlFor="veiculo" className="label-text">Veículo *</label>
                    <input type="text" id="veiculo" name="veiculo" required className="input-field" />
                </div>

                <div>
                    <label htmlFor="placa" className="label-text">Placa *</label>
                    <input type="text" id="placa" name="placa" required className="input-field" />
                </div>

                <div>
                    <label htmlFor="status" className="label-text">Status *</label>
                    <select id="status" name="status" required className="input-field appearance-none bg-white">
                        <option value="">Selecione...</option>
                        <option value="Em análise">Em análise</option>
                        <option value="Aguardando peça">Aguardando peça</option>
                        <option value="Em execução">Em execução</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Entregue">Entregue</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="servico" className="label-text">Serviço realizado *</label>
                    <textarea id="servico" name="servico" required className="input-field min-h-[100px] resize-y" />
                </div>

                <div>
                    <label htmlFor="valor" className="label-text">Valor (R$)</label>
                    <input type="number" id="valor" name="valor" step="0.01" className="input-field" placeholder="0.00" />
                </div>

                <div>
                    <label htmlFor="fotos" className="label-text">Anexos (Fotos, Vídeos ou PDF)</label>
                    <div className="relative">
                        <input
                            type="file"
                            id="fotos"
                            name="fotos"
                            accept="image/*,video/*,application/pdf"
                            multiple
                            onChange={handleFileChange}
                            className="input-field py-1"
                        />
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#005f73] text-white font-bold text-lg py-3 rounded-md hover:bg-[#004d5d] transition-colors shadow-sm disabled:opacity-70"
                    >
                        {loading ? (status || "Salvando...") : "Salvar"}
                    </button>
                    {loading && (
                        <p className="text-center text-sm text-gray-500 mt-2 animate-pulse">
                            Não feche a página...
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
}
