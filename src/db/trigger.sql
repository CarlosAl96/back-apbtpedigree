DELIMITER $$

CREATE TRIGGER log_dog_changes
AFTER UPDATE ON  dogsBackUp2
FOR EACH ROW
BEGIN
    -- Registro de cambios en la columna 'name'
    IF OLD.name <> NEW.name THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Name from ', OLD.name, ' to ', NEW.name), NOW());
    END IF;

    -- Registro de cambios en la columna 'beforeNameTitles'
    IF OLD.beforeNameTitles <> NEW.beforeNameTitles THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Before Name Titles from ', OLD.beforeNameTitles, ' to ', NEW.beforeNameTitles), NOW());
    END IF;

    -- Registro de cambios en la columna 'afterNameTitles'
    IF OLD.afterNameTitles <> NEW.afterNameTitles THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed After Name Titles from ', OLD.afterNameTitles, ' to ', NEW.afterNameTitles), NOW());
    END IF;

    -- Registro de cambios en la columna 'description'
    IF OLD.description <> NEW.description THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Description from ', OLD.description, ' to ', NEW.description), NOW());
    END IF;

    -- Registro de cambios en la columna 'birthdate'
    IF OLD.birthdate <> NEW.birthdate THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Birthdate from ', OLD.birthdate, ' to ', NEW.birthdate), NOW());
    END IF;

    -- Registro de cambios en la columna 'owner'
    IF OLD.owner <> NEW.owner THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Owner from ', OLD.user_id, ' to ', NEW.user_id), NOW());
    END IF;

    -- Registro de cambios en la columna 'breeder'
    IF OLD.breeder <> NEW.breeder THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Breeder from ', OLD.breeder, ' to ', NEW.breeder), NOW());
    END IF;

    -- Registro de cambios en la columna 'conditioned_weight'
    IF OLD.conditioned_weight <> NEW.conditioned_weight THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Conditioned Weight from ', OLD.conditioned_weight, ' to ', NEW.conditioned_weight), NOW());
    END IF;

    -- Registro de cambios en la columna 'chain_weight'
    IF OLD.chain_weight <> NEW.chain_weight THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Chain Weight from ', OLD.chain_weight, ' to ', NEW.chain_weight), NOW());
    END IF;

    -- Registro de cambios en la columna 'img'
    IF OLD.img <> NEW.img THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Img from ', OLD.img, ' to ', NEW.img), NOW());
    END IF;

    -- Registro de cambios en la columna 'sex'
    IF OLD.sex <> NEW.sex THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Sex from ', OLD.sex, ' to ', NEW.sex), NOW());
    END IF;

    -- Registro de cambios en la columna 'color'
    IF OLD.color <> NEW.color THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Color from ', OLD.color, ' to ', NEW.color), NOW());
    END IF;

    -- Registro de cambios en la columna 'callname'
    IF OLD.callname <> NEW.callname THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Callname from ', OLD.callname, ' to ', NEW.callname), NOW());
    END IF;

    -- Registro de cambios en la columna 'registration'
    IF OLD.registration <> NEW.registration THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Registration from ', OLD.registration, ' to ', NEW.registration), NOW());
    END IF;

    -- Registro de cambios en la columna 'father_id'
    IF OLD.father_id <> NEW.father_id THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Father ID from ', OLD.father_id, ' to ', NEW.father_id), NOW());
    END IF;

    -- Registro de cambios en la columna 'mother_id'
    IF OLD.mother_id <> NEW.mother_id THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Mother ID from ', OLD.mother_id, ' to ', NEW.mother_id), NOW());
    END IF;

    -- Registro de cambios en la columna 'status'
    IF OLD.status <> NEW.status THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Status from ', OLD.status, ' to ', NEW.status), NOW());
    END IF;

    -- Registro de cambios en la columna 'fightcolor'
    IF OLD.fightcolor <> NEW.fightcolor THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Fight Color from ', OLD.fightcolor, ' to ', NEW.fightcolor), NOW());
    END IF;

    -- Registro de cambios en la columna 'title'
    IF OLD.title <> NEW.title THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Title from ', OLD.title, ' to ', NEW.title), NOW());
    END IF;

    -- Registro de cambios en la columna 'private'
    IF OLD.private <> NEW.private THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Private from ', OLD.private, ' to ', NEW.private), NOW());
    END IF;

    -- Registro de cambios en la columna 'changePermissions'
    IF OLD.changePermissions <> NEW.changePermissions THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Change Permissions from ', OLD.changePermissions, ' to ', NEW.changePermissions), NOW());
    END IF;

    -- Registro de cambios en la columna 'descriptionOwner'
    IF OLD.descriptionOwner <> NEW.descriptionOwner THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Description Owner from ', OLD.descriptionOwner, ' to ', NEW.descriptionOwner), NOW());
    END IF;

    -- Registro de cambios en la columna 'registrationNumber'
    IF OLD.registrationNumber <> NEW.registrationNumber THEN
        INSERT INTO dogs_log (user_id, dog_id, description, date)
        VALUES (NEW.user_id, NEW.id, CONCAT('Changed Registration Number from ', OLD.registrationNumber, ' to ', NEW.registrationNumber), NOW());
    END IF;

END$$

DELIMITER ;
