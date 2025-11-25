import React from 'react';
import { Container } from 'react-bootstrap';

const Politicas = () => {
  return (
    <Container style={{ paddingTop: '120px' }}>
      <h1>Política de Privacidad</h1>
        <p className="mb-4">
        En <strong>AmbienteFest</strong> trabajamos con responsabilidad,
        transparencia y compromiso. Estas políticas reflejan nuestra forma de
        operar y los valores que guían cada uno de nuestros servicios.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Política de calidad</h2>
      <p className="mb-4">
        Buscamos ofrecer servicios que superen las expectativas de nuestros
        clientes, garantizando puntualidad, profesionalismo y excelencia en cada
        evento o servicio contratado.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        2. Política de privacidad
      </h2>
      <p className="mb-4">
        Protegemos los datos personales de nuestros usuarios y clientes. Toda la
        información recopilada se utiliza exclusivamente para fines operativos y
        no será compartida con terceros sin consentimiento.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        3. Política ambiental y sustentable
      </h2>
      <p className="mb-4">
        Promovemos prácticas sustentables en cada proyecto, reduciendo residuos
        y priorizando materiales reciclables. Buscamos un equilibrio entre la
        calidad del servicio y el respeto por el medio ambiente.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Política laboral</h2>
      <p className="mb-4">
        Fomentamos un ambiente de trabajo inclusivo, seguro y respetuoso. Nos
        comprometemos con el bienestar y desarrollo profesional de nuestro
        equipo.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        5. Política de atención al cliente
      </h2>
      <p className="mb-4">
        Valoramos la satisfacción de nuestros clientes. Ante cualquier problema
        o sugerencia, puedes comunicarte con nosotros al correo{" "}
        <a href="mailto:contacto@ambientefest.cl" className="text-fuchsia-600">
          contacto@ambientefest.cl
        </a>
        , donde te asistiremos con prontitud.
      </p>

      <p className="mt-8 text-sm text-gray-500">
        Última actualización: {new Date().toLocaleDateString()}
      </p>
    </Container>
  );
};

export default Politicas;
