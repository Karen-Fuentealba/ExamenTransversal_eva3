import React from 'react';
import { Container } from 'react-bootstrap';

const Terminos = () => {
  return (
    <Container style={{ paddingTop: '120px' }}>
      <h1>Términos y Condiciones</h1>
       <p className="mb-4">
        Bienvenido/a a <strong>AmbienteFest</strong>. Al acceder y utilizar
        nuestro sitio web, aceptas los siguientes términos y condiciones. Te
        pedimos leerlos cuidadosamente antes de utilizar nuestros servicios.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Uso del sitio</h2>
      <p className="mb-4">
        El uso de este sitio está destinado a la contratación de servicios,
        revisión de información y comunicación con nuestro equipo. No está
        permitido el uso indebido, distribución no autorizada o intento de
        acceder a información privada.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Registro de usuarios</h2>
      <p className="mb-4">
        Para contratar o realizar compras, deberás registrarte proporcionando
        información veraz y actualizada. Eres responsable de mantener la
        confidencialidad de tus credenciales.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Pagos y reservas</h2>
      <p className="mb-4">
        Los precios y condiciones de pago se muestran claramente en cada
        servicio. <strong>AMBIENTEFest</strong> se reserva el derecho de
        modificar precios o promociones sin previo aviso.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Cancelaciones</h2>
      <p className="mb-4">
        Las cancelaciones o reembolsos se gestionarán según las políticas
        vigentes de la empresa. En caso de duda, puedes contactar con nuestro
        equipo de soporte a través de{" "}
        <a href="mailto:contacto@ambientefest.cl" className="text-fuchsia-600">
          contacto@ambientefest.cl
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Modificaciones</h2>
      <p className="mb-4">
        Nos reservamos el derecho de modificar estos términos en cualquier
        momento. Los cambios entrarán en vigor una vez publicados en este sitio
        web.
      </p>

      <p className="mt-8 text-sm text-gray-500">
        Última actualización: {new Date().toLocaleDateString()}
      </p>
    </Container>
  );
};

export default Terminos;
