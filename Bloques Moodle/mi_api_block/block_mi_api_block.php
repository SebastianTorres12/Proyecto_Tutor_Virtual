<?php

class block_mi_api_block extends block_base {

    public function init() {
        $this->title = get_string('mi_api_block', 'block_mi_api_block');
    }

    public function has_add_block_capability($context) {
        return has_capability('block/mi_api_block:addinstance', $context);
    }

    public function get_content() {
        global $CFG, $COURSE, $USER;

        if ($this->content !== null) {
            return $this->content;
        }

        // Verificar que estamos en un curso
        if (empty($COURSE->id) || $COURSE->id == 1) {
            $this->content = new stdClass();
            $this->content->text = '<p>Este bloque solo funciona dentro de un curso.</p>';
            $this->content->footer = '';
            return $this->content;
        }

        // Obtener el ID del usuario autenticado (el estudiante)
        $userid = $USER->id;

        // Obtener el ID del curso actual
        $courseid = $COURSE->id;

        // Obtener el rol del usuario en el curso actual
        $context = context_course::instance($COURSE->id);
        $roles = get_user_roles($context, $USER->id, true);
        $role = 'student'; // Rol por defecto

        if (!empty($roles)) {
            // Obtener el primer rol del usuario en el curso
            $user_role = reset($roles);
            $role_shortname = $user_role->shortname;
            if ($role_shortname === 'student' || $role_shortname === 'teacher' || $role_shortname === 'editingteacher') {
                $role = $role_shortname === 'student' ? 'student' : 'tutor';
            }
        }

        // Incluir el archivo CSS para los estilos
        $this->page->requires->css(new moodle_url('/blocks/mi_api_block/styles.css'));

        // Pasar los datos al JavaScript, incluyendo el rol
        $this->page->requires->js_call_amd('block_mi_api_block/chat', 'init', [
            'userid' => $userid,
            'courseid' => $courseid,
            'role' => $role
        ]);

        // Contenido del bloque
        $this->content = new stdClass();
        $this->content->text = '<div id="chat-container">';
        // Agregar el botón para iniciar el escaneo
        $this->content->text .= '<button id="btn-iniciar-escaneo">Ver desempeño</button>';
        // Contenedor para los mensajes
        $this->content->text .= '<div id="chat-messages" style="height: 200px; overflow-y: scroll; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;"></div>';
        // Formulario de chat
        $this->content->text .= '<form id="chat-form">';
        $this->content->text .= '<textarea id="chat-input" placeholder="Escribe tu mensaje..." rows="3"></textarea>';
        $this->content->text .= '<button type="submit">Enviar</button>';
        $this->content->text .= '</form>';
        $this->content->text .= '</div>';

        return $this->content;
    }

    public function applicable_formats() {
        return array('course-view' => true);
    }
}