const { app } = require('@azure/functions');
const formidable = require('formidable');
const sharp = require('sharp');

app.http('ImageConverter', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'convert/jpg-to-png',
    handler: async (request, context) => {
        const startTime = Date.now();
        context.log('🚀 Iniciando conversión JPG a PNG');
        
        try {
            // Validar Content-Type
            const contentType = request.headers.get('content-type');
            
            if (!contentType || !contentType.includes('multipart/form-data')) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        'Access-Control-Allow-Credentials': 'true'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Content-Type debe ser multipart/form-data',
                        code: 'INVALID_CONTENT_TYPE'
                    })
                };
            }

            // Declarar variables
            let imageBuffer = null;
            let options = [];
            let originalSize = 0;

            // Parsear multipart data
            const body = await request.arrayBuffer();
            const form = formidable({});

            try {
                const [fields, files] = await form.parse(Buffer.from(body));
                
                const imageFile = files.file?.[0];
                if (imageFile) {
                    imageBuffer = require('fs').readFileSync(imageFile.filepath);
                    originalSize = imageBuffer.length;
                }
                options = fields.options ? JSON.parse(fields.options[0]) : [];
            } catch (error) {
                context.log.error('Error parseando multipart data:', error);
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Error parseando multipart data',
                        code: 'PARSE_ERROR'
                    })
                };
            }
            
            // Validar que se recibió archivo
            if (!imageBuffer || imageBuffer.length === 0) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'No se encontró archivo de imagen',
                        code: 'NO_FILE_FOUND'
                    })
                };
            }
            
            context.log(`📁 Archivo recibido: ${(imageBuffer.length/1024/1024).toFixed(2)}MB`);
            context.log(`⚙️ Opciones: ${JSON.stringify(options)}`);
            
            // Procesar imagen con Sharp
            let processedBuffer = sharp(imageBuffer);
            
            // Aplicar opciones si existen
            if (options.includes('optimize')) {
                processedBuffer = processedBuffer.png({ 
                    compressionLevel: 9,
                    adaptiveFiltering: true 
                });
            } else {
                processedBuffer = processedBuffer.png();
            }
            
            const result = await processedBuffer.toBuffer();
            const processedSize = result.length;
            
            // Convertir a base64
            const base64Image = result.toString('base64');
            const processingTime = Date.now() - startTime;
            
            context.log(`✅ Conversión completada en ${processingTime}ms`);
            
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Allow-Credentials': 'true'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Conversión completada exitosamente',
                    image: `data:image/png;base64,${base64Image}`,
                    originalSize: originalSize,
                    processedSize: processedSize,
                    processingTime: processingTime,
                    appliedOptions: options
                })
            };
            
        } catch (error) {
            context.log.error('❌ Error general:', error);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Allow-Credentials': 'true'
                },
                body: JSON.stringify({
                    success: false,
                    error: `Error interno: ${error.message}`,
                    code: 'INTERNAL_ERROR'
                })
            };
        }
    }
});

// CORS preflight
app.http('ImageConverterOptions', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: 'convert/jpg-to-png',
    handler: async (request, context) => {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '3600',
                'Access-Control-Allow-Credentials': 'true'
            }
        };
    }
});